package com.himma.envagent.module.rag.service;

import com.himma.envagent.common.config.VectorProperties;
import com.himma.envagent.module.knowledge.domain.DocumentChunkRecord;
import com.himma.envagent.module.knowledge.repository.DocumentChunkRepository;
import com.himma.envagent.module.knowledge.vo.KnowledgePayloads.SourceItem;
import com.himma.envagent.module.rag.service.ModelGateway.ChatTurn;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class RagService {

    public record RagAnswer(String answer, List<SourceItem> sources, int inputTokens, int outputTokens) {
    }

    private final DocumentChunkRepository documentChunkRepository;
    private final ModelGateway modelGateway;
    private final VectorProperties vectorProperties;

    public RagService(
            DocumentChunkRepository documentChunkRepository,
            ModelGateway modelGateway,
            VectorProperties vectorProperties
    ) {
        this.documentChunkRepository = documentChunkRepository;
        this.modelGateway = modelGateway;
        this.vectorProperties = vectorProperties;
    }

    public RagAnswer answer(String question, Collection<Long> kbIds, List<ChatTurn> history) {
        // 先把问题向量化，再去知识库里召回最相关的片段。
        float[] queryEmbedding = modelGateway.embed(List.of(question)).get(0);
        List<DocumentChunkRecord> rankedChunks = retrieve(queryEmbedding, kbIds, 4);
        List<SourceItem> sources = rankedChunks.stream()
                .map(chunk -> new SourceItem(
                        chunk.documentId(),
                        chunk.id(),
                        chunk.documentName(),
                        chunk.knowledgeBaseName(),
                        excerpt(chunk.content(), question),
                        chunk.score()
                ))
                .toList();

        String answer;
        int inputTokens;
        int outputTokens;
        try {
            // 主路径：把“问题 + 检索到的上下文 + 历史对话”交给大模型生成答案。
            ModelGateway.ChatResult result = modelGateway.chatResult(buildTurns(question, rankedChunks, history));
            answer = result.answer();
            inputTokens = safeTokenCount(result.inputTokens(), question);
            outputTokens = safeTokenCount(result.outputTokens(), answer);
        } catch (Exception exception) {
            // 降级路径：模型不可用时，至少返回检索摘要，保证 SSE 链路还能有结果。
            answer = fallbackAnswer(question, rankedChunks);
            inputTokens = estimateTokens(question);
            outputTokens = estimateTokens(answer);
        }
        return new RagAnswer(answer, sources, inputTokens, outputTokens);
    }

    public String formatEmbedding(float[] embedding) {
        StringBuilder builder = new StringBuilder("[");
        for (int i = 0; i < embedding.length; i++) {
            if (i > 0) {
                builder.append(',');
            }
            builder.append(embedding[i]);
        }
        builder.append(']');
        return builder.toString();
    }

    private List<DocumentChunkRecord> retrieve(float[] queryEmbedding, Collection<Long> kbIds, int limit) {
        String queryVector = formatEmbedding(queryEmbedding);
        // Postgres + pgvector 走数据库向量检索；测试环境/H2 走本地余弦相似度回退。
        List<DocumentChunkRecord> ranked = documentChunkRepository.supportsVectorSearch()
                ? documentChunkRepository.searchByVector(queryVector, kbIds, limit)
                : rankLocally(queryEmbedding, kbIds, limit);
        double threshold = vectorProperties.getSimilarityThreshold();
        List<DocumentChunkRecord> filtered = ranked.stream()
                .filter(item -> item.score() >= threshold || ranked.size() <= limit)
                .limit(limit)
                .toList();
        return filtered.isEmpty() ? ranked.stream().limit(limit).toList() : filtered;
    }

    private List<DocumentChunkRecord> rankLocally(float[] queryEmbedding, Collection<Long> kbIds, int limit) {
        List<DocumentChunkRecord> candidates = documentChunkRepository.findReadyChunks(kbIds);
        List<DocumentChunkRecord> ranked = new ArrayList<>();
        for (DocumentChunkRecord candidate : candidates) {
            if (candidate.embedding() == null || candidate.embedding().isBlank()) {
                continue;
            }
            double score = cosine(queryEmbedding, parseEmbedding(candidate.embedding()));
            ranked.add(new DocumentChunkRecord(
                    candidate.id(),
                    candidate.documentId(),
                    candidate.documentName(),
                    candidate.knowledgeBaseId(),
                    candidate.knowledgeBaseName(),
                    candidate.content(),
                    candidate.chunkIndex(),
                    candidate.tokenCount(),
                    candidate.embedding(),
                    score
            ));
        }
        ranked.sort(Comparator.comparingDouble(DocumentChunkRecord::score).reversed());
        return ranked.stream().limit(limit).toList();
    }

    private List<ChatTurn> buildTurns(String question, List<DocumentChunkRecord> rankedChunks, List<ChatTurn> history) {
        StringBuilder context = new StringBuilder();
        if (rankedChunks.isEmpty()) {
            context.append("未检索到相关知识库片段。");
        } else {
            for (int i = 0; i < rankedChunks.size(); i++) {
                DocumentChunkRecord chunk = rankedChunks.get(i);
                context.append("片段").append(i + 1)
                        .append(" [")
                        .append(chunk.documentName());
                if (chunk.knowledgeBaseName() != null) {
                    context.append(" / ").append(chunk.knowledgeBaseName());
                }
                context.append("]\n")
                        .append(chunk.content())
                        .append("\n\n");
            }
        }

        List<ChatTurn> turns = new ArrayList<>();
        // system 负责约束回答风格，user 负责携带当前检索上下文和问题本身。
        turns.add(new ChatTurn(
                "system",
                "你是环保领域知识库问答助手。只基于提供的上下文回答，回答要简洁、结构化；如果上下文不足，要明确说明。"
        ));
        if (history != null && !history.isEmpty()) {
            // 这里只保留最近几轮历史，避免 prompt 无限增长。
            turns.addAll(history.stream().limit(Math.max(0, history.size() - 6)).toList());
        }
        turns.add(new ChatTurn(
                "user",
                "知识库上下文如下：\n" + context + "\n当前问题：" + question
        ));
        return turns;
    }

    private String fallbackAnswer(String question, List<DocumentChunkRecord> rankedChunks) {
        if (rankedChunks.isEmpty()) {
            return "当前没有检索到可用知识库片段，暂时无法给出可靠结论。";
        }
        StringBuilder builder = new StringBuilder("基于检索到的知识库片段，先给出可演示回答：\n");
        for (int i = 0; i < rankedChunks.size(); i++) {
            DocumentChunkRecord chunk = rankedChunks.get(i);
            builder.append(i + 1)
                    .append(". ")
                    .append(chunk.documentName())
                    .append("：")
                    .append(excerpt(chunk.content(), question))
                    .append('\n');
        }
        builder.append("以上内容与问题“").append(question).append("”最相关，可据此继续人工核对原文。");
        return builder.toString().trim();
    }

    private String excerpt(String content, String query) {
        String normalized = content == null ? "" : content.replaceAll("\\s+", " ").trim();
        if (normalized.length() <= 160) {
            return normalized;
        }
        int index = query == null || query.isBlank() ? -1 : normalized.indexOf(query.substring(0, Math.min(query.length(), 4)));
        if (index < 0) {
            return normalized.substring(0, 160) + "...";
        }
        int start = Math.max(0, index - 40);
        int end = Math.min(normalized.length(), start + 160);
        return normalized.substring(start, end) + (end < normalized.length() ? "..." : "");
    }

    private int estimateTokens(String text) {
        if (text == null || text.isBlank()) {
            return 0;
        }
        return Math.max(1, text.length() / 4);
    }

    private int safeTokenCount(Integer tokenCount, String fallbackText) {
        if (tokenCount != null && tokenCount > 0) {
            return tokenCount;
        }
        return estimateTokens(fallbackText);
    }

    private float[] parseEmbedding(String value) {
        String trimmed = value.trim();
        String body = trimmed.startsWith("[") && trimmed.endsWith("]")
                ? trimmed.substring(1, trimmed.length() - 1)
                : trimmed;
        String[] parts = body.split(",");
        float[] vector = new float[parts.length];
        for (int i = 0; i < parts.length; i++) {
            vector[i] = Float.parseFloat(parts[i].trim());
        }
        return vector;
    }

    private double cosine(float[] left, float[] right) {
        int length = Math.min(left.length, right.length);
        double dot = 0;
        double leftNorm = 0;
        double rightNorm = 0;
        for (int i = 0; i < length; i++) {
            dot += left[i] * right[i];
            leftNorm += left[i] * left[i];
            rightNorm += right[i] * right[i];
        }
        if (leftNorm == 0 || rightNorm == 0) {
            return 0;
        }
        return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
    }
}
