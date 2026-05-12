package com.himma.envagent.module.conversation.repository;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.himma.envagent.module.conversation.domain.MessageRecord;
import com.himma.envagent.module.conversation.entity.MessageEntity;
import com.himma.envagent.module.conversation.mapper.MessageMapper;
import java.util.List;
import java.util.Locale;
import javax.sql.DataSource;
import org.springframework.stereotype.Repository;

@Repository
public class MessageRepository {

    private final MessageMapper messageMapper;
    private final boolean postgres;

    public MessageRepository(MessageMapper messageMapper, DataSource dataSource) throws java.sql.SQLException {
        this.messageMapper = messageMapper;
        try (java.sql.Connection connection = dataSource.getConnection()) {
            // jsonb/vector 这类能力在 H2 和 Postgres 上差异很大，这里先识别数据库类型再分支处理。
            this.postgres = connection.getMetaData().getDatabaseProductName().toLowerCase(Locale.ROOT).contains("postgres");
        }
    }

    public List<MessageRecord> findByConversationId(long conversationId) {
        return messageMapper.selectList(
                        new LambdaQueryWrapper<MessageEntity>()
                                .eq(MessageEntity::getConvId, conversationId)
                                .orderByAsc(MessageEntity::getCreatedAt, MessageEntity::getId)
                ).stream()
                .map(this::toRecord)
                .toList();
    }

    public long insert(long conversationId, String role, String content, String sourcesJson, Integer inputTokens, Integer outputTokens) {
        MessageEntity entity = new MessageEntity();
        entity.setConvId(conversationId);
        entity.setRole(role);
        entity.setContent(content);
        entity.setSources(sourcesJson == null ? "[]" : sourcesJson);
        entity.setInTokens(inputTokens);
        entity.setOutTokens(outputTokens);
        // Postgres 走带 CAST 的 SQL，保证 JSONB 字段类型正确；测试库走普通插入。
        if (postgres) {
            messageMapper.insertPostgres(entity);
        } else {
            messageMapper.insertDefault(entity);
        }
        return entity.getId() == null ? 0L : entity.getId();
    }

    public void deleteByConversationId(long conversationId) {
        messageMapper.delete(
                new LambdaQueryWrapper<MessageEntity>()
                        .eq(MessageEntity::getConvId, conversationId)
        );
    }

    private MessageRecord toRecord(MessageEntity entity) {
        return new MessageRecord(
                entity.getId(),
                entity.getConvId(),
                entity.getRole(),
                entity.getContent(),
                entity.getSources(),
                entity.getInTokens(),
                entity.getOutTokens(),
                entity.getCreatedAt()
        );
    }
}
