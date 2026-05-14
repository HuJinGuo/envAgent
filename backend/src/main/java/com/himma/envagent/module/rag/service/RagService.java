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

    /**
     * RAG 阶段的产物：
     * - turns: 给模型真正喂进去的消息
     * - sources: 前端引用来源卡片
     * - fallbackAnswer: 模型不可用时的降级回答
     *
     * 这样模型生成能力就不会继续塞在 RagService 里，
     * RagService 只负责“检索 + 组织上下文”。
     */
    public record RagContext(
            String question,
            List<ChatTurn> turns,
            List<SourceItem> sources,
            String fallbackAnswer
    ) {
    }

    private final DocumentChunkRepository documentChunkRepository;
    private final VectorProperties vectorProperties;

    public RagService(
            DocumentChunkRepository documentChunkRepository,
            VectorProperties vectorProperties
    ) {
        this.documentChunkRepository = documentChunkRepository;
        this.vectorProperties = vectorProperties;
    }

    public RagContext prepareContext(String question, float[] queryEmbedding, Collection<Long> kbIds, List<ChatTurn> history) {
        // RAG 阶段只做知识检索、sources 提取、prompt 组装，不直接调用模型。
        List<DocumentChunkRecord> rankedChunks = retrieve(queryEmbedding, kbIds, 4);
        List<SourceItem> sources = rankedChunks.stream()
                .map(chunk -> new SourceItem(
                        String.valueOf(chunk.documentId()),
                        String.valueOf(chunk.id()),
                        chunk.documentName(),
                        chunk.knowledgeBaseName(),
                        excerpt(chunk.content(), question),
                        chunk.score()
                ))
                .toList();
        return new RagContext(question, buildTurns(question, rankedChunks, history), sources, fallbackAnswer(question, rankedChunks));
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
                    candidate.metadataJson(),
                    candidate.createdAt(),
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
                "你是环保领域知识库问答助手。基于提供的上下文回答，回答要简洁、结构化；如果上下文不足，要明确说明。"
        ));
        if (history != null && !history.isEmpty()) {
            // ConversationService 进入这里之前已经裁好了最近几轮历史，这里直接拼接即可。
            turns.addAll(history);
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
