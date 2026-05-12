package com.himma.envagent.module.knowledge.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.himma.envagent.module.knowledge.entity.KnowledgeBaseEntity;
import com.himma.envagent.module.knowledge.repository.row.KnowledgeBaseSummaryRow;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface KnowledgeBaseMapper extends BaseMapper<KnowledgeBaseEntity> {

    @Select("""
            SELECT kb.id,
                   kb.code,
                   kb.name,
                   kb.description,
                   kb.sort_order,
                   kb.created_at,
                   kb.updated_at,
                   COUNT(d.id) AS document_count
            FROM knowledge_bases kb
            LEFT JOIN documents d ON d.kb_id = kb.id
            GROUP BY kb.id, kb.code, kb.name, kb.description, kb.sort_order, kb.created_at, kb.updated_at
            ORDER BY kb.sort_order ASC, kb.id ASC
            """)
    List<KnowledgeBaseSummaryRow> selectSummaries();

    @Select("""
            SELECT kb.id,
                   kb.code,
                   kb.name,
                   kb.description,
                   kb.sort_order,
                   kb.created_at,
                   kb.updated_at,
                   COUNT(d.id) AS document_count
            FROM knowledge_bases kb
            LEFT JOIN documents d ON d.kb_id = kb.id
            WHERE kb.id = #{id}
            GROUP BY kb.id, kb.code, kb.name, kb.description, kb.sort_order, kb.created_at, kb.updated_at
            """)
    KnowledgeBaseSummaryRow selectSummaryById(@Param("id") Long id);
}
