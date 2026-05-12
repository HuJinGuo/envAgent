package com.himma.envagent.module.conversation.domain;

import java.time.LocalDateTime;
import java.util.List;

public record ConversationRecord(
        Long id,
        Long userId,
        String title,
        List<Long> kbIds,
        int messageCount,
        String lastMessagePreview,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
