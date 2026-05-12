package com.himma.envagent.module.conversation.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.himma.envagent.common.api.ApiResponse;
import com.himma.envagent.common.exception.BusinessException;
import com.himma.envagent.module.auth.domain.UserEntity;
import com.himma.envagent.module.auth.service.UserService;
import com.himma.envagent.module.conversation.service.ConversationService;
import com.himma.envagent.module.conversation.vo.ConversationPayloads.ConversationCreateRequest;
import com.himma.envagent.module.conversation.vo.ConversationPayloads.ConversationItem;
import com.himma.envagent.module.conversation.vo.ConversationPayloads.ConversationReply;
import com.himma.envagent.module.conversation.vo.ConversationPayloads.ConversationTitleRequest;
import com.himma.envagent.module.conversation.vo.ConversationPayloads.MessageCreateRequest;
import com.himma.envagent.module.conversation.vo.ConversationPayloads.MessageItem;
import jakarta.validation.Valid;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
@RequestMapping("/api/v1/conversations")
public class ConversationController {

    private final ConversationService conversationService;
    private final UserService userService;
    private final ObjectMapper objectMapper;

    public ConversationController(
            ConversationService conversationService,
            UserService userService,
            ObjectMapper objectMapper
    ) {
        this.conversationService = conversationService;
        this.userService = userService;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    public ApiResponse<List<ConversationItem>> list(Authentication authentication) {
        return ApiResponse.success(conversationService.listConversations(currentUser(authentication).getId()));
    }

    @PostMapping
    public ApiResponse<ConversationItem> create(
            @RequestBody(required = false) ConversationCreateRequest request,
            Authentication authentication
    ) {
        return ApiResponse.success(conversationService.createConversation(currentUser(authentication).getId(), request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable("id") long conversationId, Authentication authentication) {
        conversationService.deleteConversation(currentUser(authentication).getId(), conversationId);
        return ApiResponse.success(null);
    }

    @PutMapping("/{id}/title")
    public ApiResponse<ConversationItem> updateTitle(
            @PathVariable("id") long conversationId,
            @Valid @RequestBody ConversationTitleRequest request,
            Authentication authentication
    ) {
        return ApiResponse.success(conversationService.updateTitle(currentUser(authentication).getId(), conversationId, request.title()));
    }

    @GetMapping("/{id}/messages")
    public ApiResponse<List<MessageItem>> listMessages(@PathVariable("id") long conversationId, Authentication authentication) {
        return ApiResponse.success(conversationService.listMessages(currentUser(authentication).getId(), conversationId));
    }

    @PostMapping(value = "/{id}/messages", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<StreamingResponseBody> postMessage(
            @PathVariable("id") long conversationId,
            @Valid @RequestBody MessageCreateRequest request,
            Authentication authentication
    ) {
        long userId = currentUser(authentication).getId();
        ConversationReply reply = conversationService.reply(userId, conversationId, request.content());
        StreamingResponseBody body = outputStream -> {
            try (OutputStreamWriter writer = new OutputStreamWriter(outputStream, StandardCharsets.UTF_8)) {
                for (String fragment : split(reply.answer(), 28)) {
                    writeEvent(writer, "delta", new DeltaPayload(fragment));
                }
                writeEvent(writer, "sources", reply.sources());
                writeEvent(writer, "done", new DonePayload(reply.messageId(), reply.inputTokens(), reply.outputTokens()));
            }
        };
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_EVENT_STREAM)
                .body(body);
    }

    private void writeEvent(OutputStreamWriter writer, String event, Object payload) throws java.io.IOException {
        writer.write("event: " + event + "\n");
        writer.write("data: " + objectMapper.writeValueAsString(payload) + "\n\n");
        writer.flush();
    }

    private List<String> split(String text, int chunkSize) {
        java.util.ArrayList<String> parts = new java.util.ArrayList<>();
        if (text == null || text.isBlank()) {
            parts.add("");
            return parts;
        }
        for (int start = 0; start < text.length(); start += chunkSize) {
            parts.add(text.substring(start, Math.min(text.length(), start + chunkSize)));
        }
        return parts;
    }

    private UserEntity currentUser(Authentication authentication) {
        return userService.findByUsername(authentication.getName())
                .orElseThrow(() -> new BusinessException(401, "当前用户不存在"));
    }

    private record DeltaPayload(String content) {
    }

    private record DonePayload(Long messageId, int inputTokens, int outputTokens) {
    }
}
