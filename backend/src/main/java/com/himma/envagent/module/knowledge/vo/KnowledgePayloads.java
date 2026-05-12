package com.himma.envagent.module.knowledge.vo;

import java.time.LocalDateTime;
import java.util.List;

public final class KnowledgePayloads {

    private KnowledgePayloads() {
    }

    public record KnowledgeBaseItem(
            Long id,
            String code,
            String name,
            String description,
            long documentCount
    ) {
    }

    public record DocumentItem(
            Long id,
            Long kbId,
            String kbName,
            String filename,
            String name,
            long fileSize,
            String sizeLabel,
            String status,
            int chunkCount,
            String errorMessage,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
    }

    public record DocumentStatusItem(
            Long id,
            String status,
            int chunkCount,
            String errorMessage,
            LocalDateTime updatedAt
    ) {
    }

    public record UploadDocumentResponse(
            Long id,
            String status,
            int chunkCount
    ) {
    }

    public record SourceItem(
            Long documentId,
            Long chunkId,
            String documentName,
            String knowledgeBaseName,
            String excerpt,
            double score
    ) {
    }

    public record ChunkingResult(
            List<ChunkPayload> chunks,
            boolean remoteEmbeddingUsed
    ) {
    }

    /**
     * 写入数据库的切片载荷。
     *
     * @param content      切片正文（普通段落或 Markdown 表格）
     * @param chunkIndex   切片序号（文档内全局递增，便于按出现顺序回放）
     * @param tokenCount   粗估 token 数
     * @param embedding    向量化后的字符串表示（形如 "[0.1,0.2,...]"）
     * @param chunkType    切片类型："text" 或 "table"，便于检索时差异化展示
     * @param metadataJson 已序列化好的 JSON，写入 document_chunks.metadata（JSONB）
     */
    public record ChunkPayload(
            String content,
            int chunkIndex,
            int tokenCount,
            String embedding,
            String chunkType,
            String metadataJson
    ) {
    }
}
