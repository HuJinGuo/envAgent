package com.himma.envagent.module.conversation.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.himma.envagent.common.exception.BusinessException;
import com.himma.envagent.module.conversation.domain.ConversationRecord;
import com.himma.envagent.module.conversation.domain.MessageRecord;
import com.himma.envagent.module.conversation.repository.ConversationRepository;
import com.himma.envagent.module.conversation.repository.MessageRepository;
import com.himma.envagent.module.conversation.vo.ConversationPayloads.ConversationCreateRequest;
import com.himma.envagent.module.conversation.vo.ConversationPayloads.ConversationItem;
import com.himma.envagent.module.conversation.vo.ConversationPayloads.ConversationReply;
import com.himma.envagent.module.conversation.vo.ConversationPayloads.MessageItem;
import com.himma.envagent.module.knowledge.vo.KnowledgePayloads.SourceItem;
import com.himma.envagent.module.rag.service.ModelGateway.ChatTurn;
import com.himma.envagent.module.rag.service.RagService;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConversationService {

    private static final TypeReference<List<SourceItem>> SOURCE_LIST_TYPE = new TypeReference<>() {
    };

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final RagService ragService;
    private final ObjectMapper objectMapper;

    public ConversationService(
            ConversationRepository conversationRepository,
            MessageRepository messageRepository,
            RagService ragService,
            ObjectMapper objectMapper
    ) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.ragService = ragService;
        this.objectMapper = objectMapper;
    }

    public List<ConversationItem> listConversations(long userId) {
        return conversationRepository.findByUserId(userId).stream()
                .map(this::toConversationItem)
                .toList();
    }

    @Transactional
    public ConversationItem createConversation(long userId, ConversationCreateRequest request) {
        String title = request == null || request.title() == null || request.title().isBlank()
                ? "新建会话"
                : request.title().trim();
        long conversationId = conversationRepository.insert(userId, title, request == null ? List.of() : nullSafe(request.kbIds()));
        ConversationRecord record = conversationRepository.findByIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new BusinessException(500, "会话创建失败"));
        return toConversationItem(record);
    }

    @Transactional
    public void deleteConversation(long userId, long conversationId) {
        requireConversation(userId, conversationId);
        messageRepository.deleteByConversationId(conversationId);
        conversationRepository.delete(conversationId, userId);
    }

    @Transactional
    public ConversationItem updateTitle(long userId, long conversationId, String title) {
        if (title == null || title.isBlank()) {
            throw new BusinessException(400, "title 不能为空");
        }
        requireConversation(userId, conversationId);
        conversationRepository.updateTitle(conversationId, userId, title.trim());
        return conversationRepository.findByIdAndUserId(conversationId, userId)
                .map(this::toConversationItem)
                .orElseThrow(() -> new BusinessException(404, "会话不存在"));
    }

    public List<MessageItem> listMessages(long userId, long conversationId) {
        requireConversation(userId, conversationId);
        return messageRepository.findByConversationId(conversationId).stream()
                .map(this::toMessageItem)
                .toList();
    }

    @Transactional
    public ConversationReply reply(long userId, long conversationId, String content) {
        ConversationRecord conversation = requireConversation(userId, conversationId);
        String trimmed = content == null ? "" : content.trim();
        if (trimmed.isBlank()) {
            throw new BusinessException(400, "content 不能为空");
        }

        // 先保存用户问题，再去调 RAG，这样即使后续模型失败，也能保留完整会话轨迹。
        long userMessageId = messageRepository.insert(conversationId, "user", trimmed, "[]", estimateTokens(trimmed), null);
        List<MessageRecord> historyRecords = messageRepository.findByConversationId(conversationId);
        if (conversation.messageCount() == 0 || "新建会话".equals(conversation.title())) {
            // 首轮对话自动把标题改成问题摘要，方便会话列表展示。
            conversationRepository.updateTitle(conversationId, userId, summarizeTitle(trimmed));
        }

        // 历史消息不包含刚保存的当前 user turn，避免在 prompt 里重复一次当前问题。
        List<ChatTurn> history = historyRecords.stream()
                .filter(message -> message.id() != userMessageId)
                .map(message -> new ChatTurn(message.role(), message.content()))
                .toList();
        RagService.RagAnswer ragAnswer = ragService.answer(trimmed, conversation.kbIds(), history);
        String sourcesJson = writeSources(ragAnswer.sources());
        // assistant 回复和命中的 sources 一起持久化，后续消息列表和 sources 面板都靠它回显。
        long assistantMessageId = messageRepository.insert(
                conversationId,
                "assistant",
                ragAnswer.answer(),
                sourcesJson,
                ragAnswer.inputTokens(),
                ragAnswer.outputTokens()
        );
        conversationRepository.touch(conversationId);
        return new ConversationReply(
                assistantMessageId,
                ragAnswer.answer(),
                ragAnswer.sources(),
                ragAnswer.inputTokens(),
                ragAnswer.outputTokens()
        );
    }

    public ConversationRecord requireConversation(long userId, long conversationId) {
        return conversationRepository.findByIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new BusinessException(404, "会话不存在"));
    }

    private ConversationItem toConversationItem(ConversationRecord record) {
        return new ConversationItem(
                record.id(),
                record.title(),
                record.kbIds(),
                record.messageCount(),
                record.lastMessagePreview(),
                record.createdAt(),
                record.updatedAt()
        );
    }

    private MessageItem toMessageItem(MessageRecord record) {
        return new MessageItem(
                record.id(),
                record.role(),
                record.content(),
                readSources(record.sourcesJson()),
                record.inputTokens(),
                record.outputTokens(),
                record.createdAt()
        );
    }

    private List<SourceItem> readSources(String sourcesJson) {
        if (sourcesJson == null || sourcesJson.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(sourcesJson, SOURCE_LIST_TYPE);
        } catch (JsonProcessingException exception) {
            // sources 解析失败不影响主消息展示，这里做降级而不是直接抛错。
            return List.of();
        }
    }

    private String writeSources(List<SourceItem> sources) {
        try {
            return objectMapper.writeValueAsString(sources == null ? List.of() : sources);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("failed to serialize sources", exception);
        }
    }

    private String summarizeTitle(String content) {
        return content.length() <= 24 ? content : content.substring(0, 24);
    }

    private int estimateTokens(String content) {
        return Math.max(1, content.length() / 4);
    }

    private List<Long> nullSafe(List<Long> kbIds) {
        return kbIds == null ? List.of() : kbIds;
    }
}
