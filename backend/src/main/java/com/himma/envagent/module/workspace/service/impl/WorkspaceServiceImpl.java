package com.himma.envagent.module.workspace.service.impl;

import com.himma.envagent.module.conversation.service.ConversationService;
import com.himma.envagent.module.conversation.vo.ConversationPayloads.ConversationItem;
import com.himma.envagent.module.conversation.vo.ConversationPayloads.MessageItem;
import com.himma.envagent.module.knowledge.service.DocumentService;
import com.himma.envagent.module.knowledge.service.KnowledgeBaseService;
import com.himma.envagent.module.knowledge.vo.KnowledgePayloads.DocumentItem;
import com.himma.envagent.module.knowledge.vo.KnowledgePayloads.KnowledgeBaseItem;
import com.himma.envagent.module.knowledge.vo.KnowledgePayloads.SourceItem;
import com.himma.envagent.module.workspace.service.WorkspaceService;
import com.himma.envagent.module.agent.service.AgentTaskService;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.AgentWorkspace;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.CallRecord;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.CategoryCount;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.ChatMessage;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.ChatSession;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.ChatWorkspace;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.DashboardSnapshot;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.EnterpriseRecord;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.KnowledgeDocument;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.KnowledgeWorkspace;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.MonitorWorkspace;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.PermissionMatrix;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.QuestionRecord;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.ReferenceCard;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.SourceWorkspace;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.StatusCard;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.SummaryCard;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.ToolCard;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.UsageBreakdown;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.UsageShare;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.UserRecord;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.UsersWorkspace;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.WorkspaceScope;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class WorkspaceServiceImpl implements WorkspaceService {

    private static final DateTimeFormatter CHAT_TIME_FORMATTER = DateTimeFormatter.ofPattern("MM-dd HH:mm");

    private final DocumentService documentService;
    private final KnowledgeBaseService knowledgeBaseService;
    private final ConversationService conversationService;
    private final AgentTaskService agentTaskService;

    public WorkspaceServiceImpl(
            DocumentService documentService,
            KnowledgeBaseService knowledgeBaseService,
            ConversationService conversationService,
            AgentTaskService agentTaskService
    ) {
        this.documentService = documentService;
        this.knowledgeBaseService = knowledgeBaseService;
        this.conversationService = conversationService;
        this.agentTaskService = agentTaskService;
    }

    @Override
    public DashboardSnapshot getDashboard() {
        return new DashboardSnapshot(
                38,
                0.94,
                (int) documentService.countDocuments(),
                12,
                (int) agentTaskService.countActive(),
                (int) agentTaskService.countDone(),
                0.82,
                24.6,
                List.of(
                        new QuestionRecord("q1", "鑫达化工 COD 近 30 天趋势", "张析", "10 分钟前"),
                        new QuestionRecord("q2", "GB 16297 无组织排放标准", "王检", "32 分钟前"),
                        new QuestionRecord("q3", "生成上月废水监测报告", "张析", "1 小时前"),
                        new QuestionRecord("q4", "氨氮超标原因分析", "陈局", "2 小时前"),
                        new QuestionRecord("q5", "许可证有效期核查", "李工", "3 小时前")
                ),
                List.of(
                        new UsageBreakdown("环保法规", 78, "#4cc3ff"),
                        new UsageBreakdown("排放标准", 65, "#d7ff64"),
                        new UsageBreakdown("内部文件", 42, "#7be3c6")
                ),
                List.of(
                        new StatusCard("ts1", "问答闭环", "稳定运行", "SSE 问答、消息持久化与 RAG 检索已接入真实后端"),
                        new StatusCard("ts2", "知识入库", "真实运行", "支持本地落盘、异步解析、切片与状态轮询"),
                        new StatusCard("ts3", "权限体系", "基础完成", "页面级角色边界与接口权限保持一致")
                )
        );
    }

    @Override
    public ChatWorkspace getChatWorkspace(Long userId) {
        List<ConversationItem> conversations = conversationService.listConversations(userId);
        List<MessageItem> selectedMessages = conversations.isEmpty()
                ? List.of()
                : conversationService.listMessages(userId, conversations.get(0).id());
        List<SourceItem> selectedSources = selectedMessages.stream()
                .filter(message -> "assistant".equals(message.role()) && message.sources() != null && !message.sources().isEmpty())
                .reduce((left, right) -> right)
                .map(MessageItem::sources)
                .orElse(List.of());

        return new ChatWorkspace(
                conversations.stream()
                        .map(item -> new ChatSession(
                                String.valueOf(item.id()),
                                item.title(),
                                timeGroup(item.updatedAt()),
                                item.updatedAt() == null ? "" : item.updatedAt().format(CHAT_TIME_FORMATTER)
                        ))
                        .toList(),
                buildScopes(conversations.isEmpty() ? List.of() : conversations.get(0).kbIds()),
                List.of(
                        "对近 30 天 COD 超标情况做摘要",
                        "列出许可即将到期的重点企业",
                        "根据监测数据生成现场核查建议",
                        "解释 GB 8978 二级标准适用条件"
                ),
                selectedMessages.stream()
                        .map(item -> new ChatMessage(
                                String.valueOf(item.id()),
                                item.role(),
                                item.content(),
                                item.sources() == null ? null : item.sources().stream().map(SourceItem::documentName).distinct().toList()
                        ))
                        .toList(),
                selectedSources.stream()
                        .map(item -> new ReferenceCard(
                                String.valueOf(item.chunkId()),
                                item.documentName(),
                                item.excerpt(),
                                item.knowledgeBaseName(),
                                item.score()
                        ))
                        .toList()
        );
    }

    @Override
    public KnowledgeWorkspace getKnowledgeWorkspace() {
        List<DocumentItem> documents = documentService.list(null);
        List<KnowledgeBaseItem> knowledgeBases = knowledgeBaseService.list();
        return new KnowledgeWorkspace(
                List.of(
                        new SummaryCard("k1", "知识库总量", documentService.countDocuments() + " 份", "当前文档总数"),
                        new SummaryCard("k2", "解析队列", documentService.countProcessingDocuments() + " 份", "PENDING/PROCESSING 状态文档"),
                        new SummaryCard("k3", "向量切片", documentService.countChunks() + " 段", "切片与 embedding 已回写")
                ),
                buildCategories(knowledgeBases),
                documents.stream()
                        .map(item -> new KnowledgeDocument(
                                String.valueOf(item.id()),
                                item.filename(),
                                item.kbName() == null ? "未分类" : item.kbName(),
                                item.sizeLabel(),
                                item.chunkCount(),
                                item.createdAt() == null ? "" : item.createdAt().format(CHAT_TIME_FORMATTER),
                                localizedStatus(item.status())
                        ))
                        .toList()
        );
    }

    @Override
    public SourceWorkspace getSourceWorkspace() {
        return new SourceWorkspace(
                List.of(
                        new EnterpriseRecord(
                                "e1",
                                "鑫达化工有限公司",
                                "化工",
                                "91330100...2021",
                                2,
                                3,
                                "重点",
                                "有效",
                                "超标",
                                "滨江工业园 A3 区",
                                "环保负责人 周明 / 138****1203",
                                "5 月 8 日 COD 峰值 186 mg/L，建议发起现场核查",
                                List.of("近 30 天 6 次超标", "废水排口 DW001 波动增大", "建议核查预处理设施运行记录")
                        ),
                        new EnterpriseRecord(
                                "e2",
                                "宏达金属制品有限公司",
                                "金属制品",
                                "91330100...2022",
                                1,
                                2,
                                "一般",
                                "即将到期",
                                "正常",
                                "临港制造基地 7 号楼",
                                "安环主管 徐楠 / 139****6532",
                                "排污许可证 21 天后到期，建议启动续证提醒",
                                List.of("在线监测正常", "许可证即将到期", "需补齐上季度台账归档")
                        ),
                        new EnterpriseRecord(
                                "e3",
                                "东方纺织印染厂",
                                "纺织印染",
                                "91330100...2023",
                                3,
                                2,
                                "重点",
                                "有效",
                                "正常",
                                "钱塘新区纺织园",
                                "企业联络人 何俊 / 137****9008",
                                "本周未见异常波动，排水色度稳定",
                                List.of("近 7 天无超标", "印染废水夜间流量正常", "可作为同行业对标样本")
                        )
                )
        );
    }

    @Override
    public AgentWorkspace getAgentWorkspace() {
        return new AgentWorkspace(
                agentTaskService.listTools().stream()
                        .map(t -> new ToolCard(t.id(), t.name(), t.description(), t.status()))
                        .toList()
        );
    }

    @Override
    public MonitorWorkspace getMonitorWorkspace() {
        return new MonitorWorkspace(
                "99.8%",
                "1.24s",
                48_200,
                "¥24.6",
                List.of(36, 42, 51, 57, 61, 54, 66),
                List.of(
                        new UsageShare("b1", "问答调用", 64, "#4cc3ff"),
                        new UsageShare("b2", "Agent 任务", 28, "#d7ff64"),
                        new UsageShare("b3", "Embedding", 8, "#7be3c6")
                ),
                List.of(
                        new CallRecord("c1", "14:32:10", "张析", "gpt-5.4", "问答", 1840, 1020, "1.2s", "¥0.04", "成功"),
                        new CallRecord("c2", "14:28:44", "王检", "gpt-5.4", "Agent", 5120, 3200, "4.6s", "¥0.18", "成功"),
                        new CallRecord("c3", "14:15:02", "embedding", "deterministic-or-openai", "向量化", 12400, null, "0.8s", "¥0.01", "成功"),
                        new CallRecord("c4", "13:58:33", "陈局", "gpt-5.4", "问答", 2240, 890, "1.5s", "¥0.05", "成功"),
                        new CallRecord("c5", "13:42:17", "李工", "gpt-5.4", "Agent", 4880, 2640, "5.2s", "¥0.16", "超时")
                )
        );
    }

    @Override
    public UsersWorkspace getUsersWorkspace() {
        return new UsersWorkspace(
                List.of(
                        new UserRecord("u1", "陈局长", "陈", "管理层", "局办公室", "今天 09:12", "启用"),
                        new UserRecord("u2", "张析", "张", "监测分析员", "监测科", "今天 14:30", "启用"),
                        new UserRecord("u3", "王检", "王", "执法人员", "执法大队", "今天 11:45", "启用"),
                        new UserRecord("u4", "李工", "李", "执法人员", "执法大队", "昨天 16:20", "启用")
                ),
                List.of(
                        new PermissionMatrix("AI 智能问答", true, true, true),
                        new PermissionMatrix("知识库查询", true, true, true),
                        new PermissionMatrix("知识库上传", false, true, true),
                        new PermissionMatrix("污染源档案", true, true, true),
                        new PermissionMatrix("Agent 任务", false, true, true),
                        new PermissionMatrix("系统监控", false, false, true),
                        new PermissionMatrix("用户管理", false, false, true)
                )
        );
    }

    private List<WorkspaceScope> buildScopes(List<Long> enabledKbIds) {
        return knowledgeBaseService.list().stream()
                .map(item -> new WorkspaceScope(
                        String.valueOf(item.id()),
                        item.name(),
                        enabledKbIds.isEmpty() || enabledKbIds.contains(item.id())
                ))
                .toList();
    }

    private List<CategoryCount> buildCategories(List<KnowledgeBaseItem> knowledgeBases) {
        List<CategoryCount> categories = new ArrayList<>();
        categories.add(new CategoryCount("all", "全部", (int) documentService.countDocuments()));
        categories.addAll(knowledgeBases.stream()
                .map(item -> new CategoryCount(item.code(), item.name(), (int) item.documentCount()))
                .toList());
        return categories;
    }

    private String localizedStatus(String status) {
        return switch (status) {
            case "READY" -> "已入库";
            case "PROCESSING" -> "解析中";
            case "FAILED" -> "失败";
            default -> "待切片";
        };
    }

    private String timeGroup(LocalDateTime updatedAt) {
        if (updatedAt == null) {
            return "更早";
        }
        LocalDate today = LocalDate.now();
        if (updatedAt.toLocalDate().equals(today)) {
            return "今天";
        }
        if (updatedAt.toLocalDate().equals(today.minusDays(1))) {
            return "昨天";
        }
        return "更早";
    }
}
