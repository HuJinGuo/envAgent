package com.himma.envagent.module.agent.service;

import com.himma.envagent.module.agent.domain.AgentTaskStatus;
import com.himma.envagent.module.agent.repository.AgentTaskRepository;
import com.himma.envagent.module.agent.tool.AgentTool;
import com.himma.envagent.module.agent.vo.AgentPayloads.AgentLogItem;
import com.himma.envagent.module.knowledge.repository.DocumentChunkRepository;
import com.himma.envagent.module.rag.service.LlmChatService;
import com.himma.envagent.module.rag.service.ModelGateway.ChatTurn;
import com.himma.envagent.module.rag.service.RagService;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * 四段式 Agent 执行引擎：
 * INTENT（意图识别）→ KNOWLEDGE（知识检索）→ TOOL_CALL（工具调用）→ REPORT（生成报告）
 *
 * 每个步骤通过 AgentEventBus 实时推送日志，SSE 端点订阅后即可流式输出给前端。
 */
@Service
public class AgentTaskRunner {

    private static final Logger log = LoggerFactory.getLogger(AgentTaskRunner.class);
    private static final DateTimeFormatter TS_FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss");

    private final AgentTaskRepository repository;
    private final AgentEventBus eventBus;
    private final LlmChatService llmChatService;
    private final RagService ragService;
    private final DocumentChunkRepository documentChunkRepository;
    private final List<AgentTool> tools;

    public AgentTaskRunner(
            AgentTaskRepository repository,
            AgentEventBus eventBus,
            LlmChatService llmChatService,
            RagService ragService,
            DocumentChunkRepository documentChunkRepository,
            List<AgentTool> tools
    ) {
        this.repository = repository;
        this.eventBus = eventBus;
        this.llmChatService = llmChatService;
        this.ragService = ragService;
        this.documentChunkRepository = documentChunkRepository;
        this.tools = tools;
    }

    @Async
    public void run(long taskId, String instruction) {
        try {
            repository.updateStatus(taskId, AgentTaskStatus.RUNNING, "INTENT");
            String intentType = runIntentStep(taskId, instruction);
            String knowledgeContext = runKnowledgeStep(taskId, instruction);
            String toolResults = runToolStep(taskId, instruction, intentType, knowledgeContext);
            String output = runReportStep(taskId, instruction, knowledgeContext, toolResults);
            repository.updateDone(taskId, output);
            publishLog(taskId, "REPORT", "done", "任务完成，报告已生成");
            eventBus.publishTerminal(taskId);
        } catch (Exception exception) {
            log.error("agent task {} failed", taskId, exception);
            String errorMsg = exception.getMessage() == null ? exception.getClass().getSimpleName() : exception.getMessage();
            repository.updateFailed(taskId, errorMsg);
            publishLog(taskId, "SYSTEM", "failed", "任务执行失败：" + errorMsg);
            eventBus.publishTerminal(taskId);
        }
    }

    private String runIntentStep(long taskId, String instruction) {
        repository.updateStatus(taskId, AgentTaskStatus.RUNNING, "INTENT");
        publishLog(taskId, "INTENT", "running", "开始意图识别...");

        String intentType = classifyIntent(instruction);
        String intentLabel = intentLabel(intentType);

        publishLog(taskId, "INTENT", "done", "识别为「" + intentLabel + "」任务，启动工作流");
        return intentType;
    }

    private String runKnowledgeStep(long taskId, String instruction) {
        repository.updateStatus(taskId, AgentTaskStatus.RUNNING, "KNOWLEDGE");
        publishLog(taskId, "KNOWLEDGE", "running", "正在检索知识库...");

        try {
            List<float[]> embeddings = llmChatService.embedTexts(List.of(instruction));
            if (embeddings.isEmpty() || embeddings.get(0) == null) {
                publishLog(taskId, "KNOWLEDGE", "done", "知识库 Embedding 服务不可用，跳过检索");
                return "";
            }
            float[] queryEmbedding = embeddings.get(0);
            RagService.RagContext ragContext = ragService.prepareContext(
                    instruction, queryEmbedding, List.of(), List.of());

            int chunkCount = ragContext.sources().size();
            if (chunkCount == 0) {
                publishLog(taskId, "KNOWLEDGE", "done", "知识库中未检索到相关内容");
                return "";
            }

            publishLog(taskId, "KNOWLEDGE", "done",
                    "知识库检索完成，命中 " + chunkCount + " 个相关片段");

            StringBuilder context = new StringBuilder();
            for (int i = 0; i < ragContext.sources().size(); i++) {
                var src = ragContext.sources().get(i);
                context.append("片段").append(i + 1).append(" [").append(src.documentName()).append("]:\n")
                        .append(src.excerpt()).append("\n\n");
            }
            return context.toString();

        } catch (Exception ex) {
            publishLog(taskId, "KNOWLEDGE", "done", "知识库检索异常：" + ex.getMessage());
            return "";
        }
    }

    private String runToolStep(long taskId, String instruction, String intentType, String knowledgeContext) {
        repository.updateStatus(taskId, AgentTaskStatus.RUNNING, "TOOL_CALL");
        publishLog(taskId, "TOOL_CALL", "running", "开始工具调用...");

        List<AgentTool> selected = selectTools(intentType);
        if (selected.isEmpty()) {
            publishLog(taskId, "TOOL_CALL", "done", "当前任务无需外部工具调用");
            return "";
        }

        StringBuilder results = new StringBuilder();
        for (AgentTool tool : selected) {
            publishLog(taskId, "TOOL_CALL", "running", "调用工具：" + tool.name());
            try {
                String result = tool.execute(instruction, knowledgeContext);
                results.append(result).append("\n");
                publishLog(taskId, "TOOL_CALL", "done", tool.name() + " 调用完成");
            } catch (Exception ex) {
                publishLog(taskId, "TOOL_CALL", "failed", tool.name() + " 调用失败：" + ex.getMessage());
            }
        }
        return results.toString();
    }

    private String runReportStep(long taskId, String instruction, String knowledgeContext, String toolResults) {
        repository.updateStatus(taskId, AgentTaskStatus.RUNNING, "REPORT");
        publishLog(taskId, "REPORT", "running", "正在生成报告，请稍候...");

        List<ChatTurn> turns = buildReportPrompt(instruction, knowledgeContext, toolResults);
        String fallback = buildFallbackReport(instruction, knowledgeContext, toolResults);

        LlmChatService.GenerationResult result = llmChatService.answer(turns, instruction, fallback);
        String output = result.answer();
        if (output == null || output.isBlank()) {
            output = fallback;
        }

        int charCount = output.length();
        publishLog(taskId, "REPORT", "running", "报告生成完成，共 " + charCount + " 字");
        return output;
    }

    private List<ChatTurn> buildReportPrompt(String instruction, String knowledgeContext, String toolResults) {
        List<ChatTurn> turns = new ArrayList<>();
        turns.add(new ChatTurn("system",
                "你是环保执法辅助 AI 助手，负责根据用户指令、知识库检索内容和工具调用结果，生成结构化的专业分析报告。" +
                "报告需包含：任务摘要、主要发现、风险评估（如适用）、执法建议。格式清晰，语言专业简洁。"));

        StringBuilder userContent = new StringBuilder();
        userContent.append("任务指令：").append(instruction).append("\n\n");

        if (knowledgeContext != null && !knowledgeContext.isBlank()) {
            userContent.append("知识库检索结果：\n").append(knowledgeContext).append("\n");
        }
        if (toolResults != null && !toolResults.isBlank()) {
            userContent.append("工具调用结果：\n").append(toolResults).append("\n");
        }
        userContent.append("\n请根据以上信息生成完整的分析报告。");

        turns.add(new ChatTurn("user", userContent.toString()));
        return turns;
    }

    private String buildFallbackReport(String instruction, String knowledgeContext, String toolResults) {
        StringBuilder sb = new StringBuilder();
        sb.append("## 任务摘要\n任务指令：").append(instruction).append("\n\n");
        if (knowledgeContext != null && !knowledgeContext.isBlank()) {
            sb.append("## 知识库检索结果\n").append(knowledgeContext).append("\n");
        }
        if (toolResults != null && !toolResults.isBlank()) {
            sb.append("## 工具调用结果\n").append(toolResults).append("\n");
        }
        sb.append("## 说明\n模型服务暂时不可用，以上为原始检索和工具数据，请人工处理。");
        return sb.toString();
    }

    private String classifyIntent(String instruction) {
        String lower = instruction.toLowerCase();
        if (containsAny(lower, "合规", "检查", "执法", "核查")) {
            return "COMPLIANCE_CHECK";
        }
        if (containsAny(lower, "报告", "汇总", "生成报告", "月报", "周报")) {
            return "REPORT_GEN";
        }
        if (containsAny(lower, "监测", "废水", "废气", "排放", "数据", "超标")) {
            return "DATA_QUERY";
        }
        if (containsAny(lower, "法规", "标准", "gb", "hj", "规定")) {
            return "REGULATION_LOOKUP";
        }
        return "GENERAL";
    }

    private String intentLabel(String intentType) {
        return switch (intentType) {
            case "COMPLIANCE_CHECK" -> "合规检查";
            case "REPORT_GEN" -> "报告生成";
            case "DATA_QUERY" -> "数据查询";
            case "REGULATION_LOOKUP" -> "法规查询";
            default -> "通用问答";
        };
    }

    private List<AgentTool> selectTools(String intentType) {
        return switch (intentType) {
            case "COMPLIANCE_CHECK" -> tools;
            case "DATA_QUERY" -> tools.stream()
                    .filter(t -> "online_monitor".equals(t.id()))
                    .toList();
            case "REPORT_GEN" -> tools.stream()
                    .filter(t -> "online_monitor".equals(t.id()) || "permit_query".equals(t.id()))
                    .toList();
            default -> List.of();
        };
    }

    private AgentLogItem publishLog(long taskId, String step, String status, String line) {
        long logId = repository.appendLog(taskId, step, status, line);
        AgentLogItem item = new AgentLogItem(
                String.valueOf(logId),
                String.valueOf(taskId),
                step,
                status,
                line,
                LocalDateTime.now().format(TS_FORMATTER)
        );
        eventBus.publish(taskId, item);
        return item;
    }

    private static boolean containsAny(String text, String... keywords) {
        for (String keyword : keywords) {
            if (text.contains(keyword)) {
                return true;
            }
        }
        return false;
    }
}
