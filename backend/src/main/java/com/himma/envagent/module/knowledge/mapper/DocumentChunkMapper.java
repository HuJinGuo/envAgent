package com.himma.envagent.module.knowledge.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.himma.envagent.module.knowledge.entity.DocumentChunkEntity;
import com.himma.envagent.module.knowledge.repository.row.DocumentChunkRow;
import java.util.Collection;
import java.util.List;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface DocumentChunkMapper extends BaseMapper<DocumentChunkEntity> {

    @Insert("""
            INSERT INTO document_chunks (id, doc_id, content, chunk_index, token_count, embedding, metadata, created_at)
            VALUES (#{id}, #{docId}, #{content}, #{chunkIndex}, #{tokenCount}, CAST(#{embedding} AS vector), CAST(#{metadata} AS jsonb), CURRENT_TIMESTAMP)
            """)
    int insertPostgres(DocumentChunkEntity entity);

    @Insert("""
            INSERT INTO document_chunks (id, doc_id, content, chunk_index, token_count, embedding, metadata, created_at)
            VALUES (#{id}, #{docId}, #{content}, #{chunkIndex}, #{tokenCount}, #{embedding}, #{metadata}, CURRENT_TIMESTAMP)
            """)
    int insertDefault(DocumentChunkEntity entity);

    @Select({
            "<script>",
            "SELECT dc.id,",
            "       dc.doc_id,",
            "       d.filename AS document_name,",
            "       d.kb_id,",
            "       kb.name AS kb_name,",
            "       dc.content,",
            "       dc.chunk_index,",
            "       dc.token_count,",
            "       dc.embedding,",
            "       dc.metadata,",
            "       dc.created_at,",
            "       1 - (dc.embedding &lt;=&gt; CAST(#{queryEmbedding} AS vector)) AS score",
            "FROM document_chunks dc",
            "JOIN documents d ON d.id = dc.doc_id",
            "LEFT JOIN knowledge_bases kb ON kb.id = d.kb_id",
            "WHERE d.status = 'READY'",
            "<if test='kbIds != null and kbIds.size() > 0'>",
            "  AND d.kb_id IN",
            "  <foreach collection='kbIds' item='kbId' open='(' separator=',' close=')'>",
            "    #{kbId}",
            "  </foreach>",
            "</if>",
            "ORDER BY dc.embedding &lt;=&gt; CAST(#{queryEmbedding} AS vector) ASC",
            "LIMIT #{limit}",
            "</script>"
    })
    List<DocumentChunkRow> searchByVector(
            @Param("queryEmbedding") String queryEmbedding,
            @Param("kbIds") Collection<Long> kbIds,
            @Param("limit") int limit
    );

    @Select({
            "<script>",
            "SELECT dc.id,",
            "       dc.doc_id,",
            "       d.filename AS document_name,",
            "       d.kb_id,",
            "       kb.name AS kb_name,",
            "       dc.content,",
            "       dc.chunk_index,",
            "       dc.token_count,",
            "       dc.embedding,",
            "       dc.metadata,",
            "       dc.created_at,",
            "       0 AS score",
            "FROM document_chunks dc",
            "JOIN documents d ON d.id = dc.doc_id",
            "LEFT JOIN knowledge_bases kb ON kb.id = d.kb_id",
            "WHERE d.status = 'READY'",
            "<if test='kbIds != null and kbIds.size() > 0'>",
            "  AND d.kb_id IN",
            "  <foreach collection='kbIds' item='kbId' open='(' separator=',' close=')'>",
            "    #{kbId}",
            "  </foreach>",
            "</if>",
            "ORDER BY d.id DESC, dc.chunk_index ASC",
            "</script>"
    })
    List<DocumentChunkRow> selectReadyChunks(@Param("kbIds") Collection<Long> kbIds);

    @Select("""
            SELECT dc.id,
                   dc.doc_id,
                   d.filename AS document_name,
                   d.kb_id,
                   kb.name AS kb_name,
                   dc.content,
                   dc.chunk_index,
                   dc.token_count,
                   dc.embedding,
                   dc.metadata,
                   dc.created_at,
                   0 AS score
            FROM document_chunks dc
            JOIN documents d ON d.id = dc.doc_id
            LEFT JOIN knowledge_bases kb ON kb.id = d.kb_id
            WHERE dc.doc_id = #{documentId}
            ORDER BY dc.chunk_index ASC
            """)
    List<DocumentChunkRow> selectByDocumentId(@Param("documentId") long documentId);
}
