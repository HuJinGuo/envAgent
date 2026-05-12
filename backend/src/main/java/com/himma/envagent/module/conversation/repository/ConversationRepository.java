package com.himma.envagent.module.conversation.repository;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.himma.envagent.module.conversation.domain.ConversationRecord;
import com.himma.envagent.module.conversation.entity.ConversationEntity;
import com.himma.envagent.module.conversation.mapper.ConversationMapper;
import com.himma.envagent.module.conversation.repository.row.ConversationSummaryRow;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class ConversationRepository {

    private final ConversationMapper conversationMapper;

    public ConversationRepository(ConversationMapper conversationMapper) {
        this.conversationMapper = conversationMapper;
    }

    public List<ConversationRecord> findByUserId(long userId) {
        return conversationMapper.selectConversationSummariesByUserId(userId).stream()
                .map(this::toRecord)
                .toList();
    }

    public Optional<ConversationRecord> findByIdAndUserId(long conversationId, long userId) {
        return Optional.ofNullable(conversationMapper.selectConversationSummaryByIdAndUserId(conversationId, userId))
                .map(this::toRecord);
    }

    public long insert(long userId, String title, List<Long> kbIds) {
        ConversationEntity entity = new ConversationEntity();
        entity.setUserId(userId);
        entity.setTitle(title);
        entity.setKbIds(kbIds == null ? List.of() : kbIds);
        conversationMapper.insert(entity);
        return entity.getId() == null ? 0L : entity.getId();
    }

    public void updateTitle(long conversationId, long userId, String title) {
        conversationMapper.update(
                null,
                new LambdaUpdateWrapper<ConversationEntity>()
                        .eq(ConversationEntity::getId, conversationId)
                        .eq(ConversationEntity::getUserId, userId)
                        .set(ConversationEntity::getTitle, title)
                        .setSql("updated_at = CURRENT_TIMESTAMP")
        );
    }

    public void touch(long conversationId) {
        conversationMapper.update(
                null,
                new LambdaUpdateWrapper<ConversationEntity>()
                        .eq(ConversationEntity::getId, conversationId)
                        .setSql("updated_at = CURRENT_TIMESTAMP")
        );
    }

    public void delete(long conversationId, long userId) {
        conversationMapper.delete(
                new LambdaQueryWrapper<ConversationEntity>()
                        .eq(ConversationEntity::getId, conversationId)
                        .eq(ConversationEntity::getUserId, userId)
        );
    }

    private ConversationRecord toRecord(ConversationSummaryRow row) {
        return new ConversationRecord(
                row.getId(),
                row.getUserId(),
                row.getTitle(),
                row.getKbIds() == null ? List.of() : row.getKbIds(),
                row.getMessageCount() == null ? 0 : row.getMessageCount(),
                row.getLastMessagePreview(),
                row.getCreatedAt(),
                row.getUpdatedAt()
        );
    }
}
