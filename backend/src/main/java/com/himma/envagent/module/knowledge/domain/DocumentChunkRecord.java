package com.himma.envagent.module.knowledge.domain;

public record DocumentChunkRecord(
        Long id,
        Long documentId,
        String documentName,
        Long knowledgeBaseId,
        String knowledgeBaseName,
        String content,
        int chunkIndex,
        int tokenCount,
        String embedding,
        String metadataJson,
        java.time.LocalDateTime createdAt,
        double score
) {
}
