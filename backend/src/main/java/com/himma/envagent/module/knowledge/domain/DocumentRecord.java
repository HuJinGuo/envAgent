package com.himma.envagent.module.knowledge.domain;

import java.time.LocalDateTime;

public record DocumentRecord(
        Long id,
        Long kbId,
        String kbName,
        String filename,
        String contentType,
        String storagePath,
        long fileSize,
        DocumentStatus status,
        int chunkCount,
        String errorMessage,
        Long createdBy,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
