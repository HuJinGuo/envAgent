package com.himma.envagent.module.conversation.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.himma.envagent.module.conversation.entity.MessageEntity;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;

@Mapper
public interface MessageMapper extends BaseMapper<MessageEntity> {

    @Insert("""
            INSERT INTO messages (conv_id, role, content, sources, in_tokens, out_tokens, created_at)
            VALUES (#{convId}, #{role}, #{content}, CAST(#{sources} AS jsonb), #{inTokens}, #{outTokens}, CURRENT_TIMESTAMP)
            """)
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insertPostgres(MessageEntity entity);

    @Insert("""
            INSERT INTO messages (conv_id, role, content, sources, in_tokens, out_tokens, created_at)
            VALUES (#{convId}, #{role}, #{content}, #{sources}, #{inTokens}, #{outTokens}, CURRENT_TIMESTAMP)
            """)
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insertDefault(MessageEntity entity);
}
