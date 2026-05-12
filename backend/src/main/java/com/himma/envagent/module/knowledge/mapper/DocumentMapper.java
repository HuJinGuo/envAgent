package com.himma.envagent.module.knowledge.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.himma.envagent.module.knowledge.entity.DocumentEntity;
import com.himma.envagent.module.knowledge.repository.row.DocumentRow;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface DocumentMapper extends BaseMapper<DocumentEntity> {

    @Select("""
            SELECT d.id,
                   d.kb_id,
                   kb.name AS kb_name,
                   d.filename,
                   d.content_type,
                   d.storage_path,
                   d.file_size,
                   d.status,
                   d.chunk_count,
                   d.error_msg,
                   d.created_by,
                   d.created_at,
                   d.updated_at
            FROM documents d
            LEFT JOIN knowledge_bases kb ON kb.id = d.kb_id
            ORDER BY d.created_at DESC, d.id DESC
            """)
    List<DocumentRow> selectDocumentRows();

    @Select("""
            SELECT d.id,
                   d.kb_id,
                   kb.name AS kb_name,
                   d.filename,
                   d.content_type,
                   d.storage_path,
                   d.file_size,
                   d.status,
                   d.chunk_count,
                   d.error_msg,
                   d.created_by,
                   d.created_at,
                   d.updated_at
            FROM documents d
            LEFT JOIN knowledge_bases kb ON kb.id = d.kb_id
            WHERE d.id = #{id}
            """)
    DocumentRow selectDocumentRowById(@Param("id") Long id);
}
