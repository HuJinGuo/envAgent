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

    public record ChunkPayload(
            String content,
            int chunkIndex,
            int tokenCount,
            String embedding
    ) {
    }
}
