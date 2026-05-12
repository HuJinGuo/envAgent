package com.himma.envagent.module.conversation.domain;

import java.time.LocalDateTime;

public record MessageRecord(
        Long id,
        Long conversationId,
        String role,
        String content,
        String sourcesJson,
        Integer inputTokens,
        Integer outputTokens,
        LocalDateTime createdAt
) {
}
