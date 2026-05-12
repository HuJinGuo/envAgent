package com.himma.envagent.module.knowledge.domain;

import java.time.LocalDateTime;

public record KnowledgeBaseRecord(
        Long id,
        String code,
        String name,
        String description,
        int sortOrder,
        long documentCount,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
