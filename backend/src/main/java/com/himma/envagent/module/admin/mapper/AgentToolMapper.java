package com.himma.envagent.module.admin.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.himma.envagent.module.admin.entity.AgentToolEntity;
import com.himma.envagent.module.admin.repository.row.AgentToolSearchRow;
import java.util.List;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface AgentToolMapper extends BaseMapper<AgentToolEntity> {

    @Insert("""
            INSERT INTO agent_tools (
                id, name, description, parameters_schema, tool_group, tags, version, enabled,
                embedding, embedding_status, embedding_error, hit_count, call_count, success_count, created_at, updated_at
            ) VALUES (
                #{id}, #{name}, #{description}, #{parametersSchema}, #{toolGroup}, #{tags}, #{version}, #{enabled},
                CAST(#{embedding} AS vector), #{embeddingStatus}, #{embeddingError}, #{hitCount}, #{callCount}, #{successCount},
                CURRENT_TIMESTAMP, #{updatedAt}
            )
            """)
    int insertPostgres(AgentToolEntity entity);

    @Insert("""
            INSERT INTO agent_tools (
                id, name, description, parameters_schema, tool_group, tags, version, enabled,
                embedding, embedding_status, embedding_error, hit_count, call_count, success_count, created_at, updated_at
            ) VALUES (
                #{id}, #{name}, #{description}, #{parametersSchema}, #{toolGroup}, #{tags}, #{version}, #{enabled},
                #{embedding}, #{embeddingStatus}, #{embeddingError}, #{hitCount}, #{callCount}, #{successCount},
                CURRENT_TIMESTAMP, #{updatedAt}
            )
            """)
    int insertDefault(AgentToolEntity entity);

    @Select({
            "<script>",
            "SELECT t.id,",
            "       t.name,",
            "       t.description,",
            "       t.parameters_schema,",
            "       t.tool_group,",
            "       t.tags,",
            "       t.version,",
            "       t.enabled,",
            "       t.embedding_status,",
            "       t.embedding_error,",
            "       t.hit_count,",
            "       t.call_count,",
            "       t.success_count,",
            "       t.created_at,",
            "       t.updated_at,",
            "       1 - (t.embedding &lt;=&gt; CAST(#{queryEmbedding} AS vector)) AS score",
            "FROM agent_tools t",
            "WHERE t.enabled = TRUE",
            "  AND t.embedding IS NOT NULL",
            "  AND t.embedding_status = 'READY'",
            "<if test='groupName != null and groupName != \"\"'>",
            "  AND t.tool_group = #{groupName}",
            "</if>",
            "<if test='roleId != null'>",
            "  AND EXISTS (SELECT 1 FROM agent_tool_roles tr WHERE tr.tool_id = t.id AND tr.role_id = #{roleId})",
            "</if>",
            "ORDER BY t.embedding &lt;=&gt; CAST(#{queryEmbedding} AS vector) ASC",
            "LIMIT #{limit}",
            "</script>"
    })
    List<AgentToolSearchRow> searchByVector(
            @Param("queryEmbedding") String queryEmbedding,
            @Param("groupName") String groupName,
            @Param("roleId") Long roleId,
            @Param("limit") int limit
    );
}
