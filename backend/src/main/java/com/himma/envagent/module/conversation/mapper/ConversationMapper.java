package com.himma.envagent.module.conversation.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.himma.envagent.module.conversation.entity.ConversationEntity;
import com.himma.envagent.module.conversation.mapper.typehandler.LongArrayTypeHandler;
import com.himma.envagent.module.conversation.repository.row.ConversationSummaryRow;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Result;
import org.apache.ibatis.annotations.Results;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface ConversationMapper extends BaseMapper<ConversationEntity> {

    @Select("""
            SELECT c.id,
                   c.user_id,
                   c.title,
                   c.kb_ids,
                   c.created_at,
                   c.updated_at,
                   COUNT(m.id) AS message_count,
                   COALESCE((
                       SELECT SUBSTRING(m2.content, 1, 120)
                       FROM messages m2
                       WHERE m2.conv_id = c.id
                       ORDER BY m2.created_at DESC, m2.id DESC
                       LIMIT 1
                   ), '') AS last_message_preview
            FROM conversations c
            LEFT JOIN messages m ON m.conv_id = c.id
            WHERE c.user_id = #{userId}
            GROUP BY c.id, c.user_id, c.title, c.kb_ids, c.created_at, c.updated_at
            ORDER BY c.updated_at DESC, c.id DESC
            """)
    @Results(id = "conversationSummaryMap", value = {
            @Result(column = "id", property = "id"),
            @Result(column = "user_id", property = "userId"),
            @Result(column = "title", property = "title"),
            @Result(column = "kb_ids", property = "kbIds", typeHandler = LongArrayTypeHandler.class),
            @Result(column = "created_at", property = "createdAt"),
            @Result(column = "updated_at", property = "updatedAt"),
            @Result(column = "message_count", property = "messageCount"),
            @Result(column = "last_message_preview", property = "lastMessagePreview")
    })
    List<ConversationSummaryRow> selectConversationSummariesByUserId(@Param("userId") long userId);

    @Select("""
            SELECT c.id,
                   c.user_id,
                   c.title,
                   c.kb_ids,
                   c.created_at,
                   c.updated_at,
                   COUNT(m.id) AS message_count,
                   COALESCE((
                       SELECT SUBSTRING(m2.content, 1, 120)
                       FROM messages m2
                       WHERE m2.conv_id = c.id
                       ORDER BY m2.created_at DESC, m2.id DESC
                       LIMIT 1
                   ), '') AS last_message_preview
            FROM conversations c
            LEFT JOIN messages m ON m.conv_id = c.id
            WHERE c.id = #{conversationId} AND c.user_id = #{userId}
            GROUP BY c.id, c.user_id, c.title, c.kb_ids, c.created_at, c.updated_at
            """)
    @Results(value = {
            @Result(column = "id", property = "id"),
            @Result(column = "user_id", property = "userId"),
            @Result(column = "title", property = "title"),
            @Result(column = "kb_ids", property = "kbIds", typeHandler = LongArrayTypeHandler.class),
            @Result(column = "created_at", property = "createdAt"),
            @Result(column = "updated_at", property = "updatedAt"),
            @Result(column = "message_count", property = "messageCount"),
            @Result(column = "last_message_preview", property = "lastMessagePreview")
    })
    ConversationSummaryRow selectConversationSummaryByIdAndUserId(
            @Param("conversationId") long conversationId,
            @Param("userId") long userId
    );
}
