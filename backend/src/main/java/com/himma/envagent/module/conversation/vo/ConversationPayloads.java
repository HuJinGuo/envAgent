package com.himma.envagent.module.conversation.vo;

import com.himma.envagent.module.knowledge.vo.KnowledgePayloads.SourceItem;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import java.util.List;

public final class ConversationPayloads {

    private ConversationPayloads() {
    }

    public record ConversationItem(
            Long id,
            String title,
            List<Long> kbIds,
            int messageCount,
            String lastMessagePreview,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
    }

    public record MessageItem(
            Long id,
            String role,
            String content,
            List<SourceItem> sources,
            Integer inputTokens,
            Integer outputTokens,
            LocalDateTime createdAt
    ) {
    }

    public record ConversationCreateRequest(
            String title,
            List<Long> kbIds
    ) {
    }

    public record ConversationTitleRequest(
            @NotBlank(message = "title 不能为空")
            String title
    ) {
    }

    public record MessageCreateRequest(
            @NotBlank(message = "content 不能为空")
            String content
    ) {
    }

    public record ConversationReply(
            Long messageId,
            String answer,
            List<SourceItem> sources,
            int inputTokens,
            int outputTokens
    ) {
    }
}
