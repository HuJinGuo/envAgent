package com.himma.envagent.module.knowledge.repository;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.himma.envagent.module.knowledge.domain.DocumentChunkRecord;
import com.himma.envagent.module.knowledge.entity.DocumentChunkEntity;
import com.himma.envagent.module.knowledge.mapper.DocumentChunkMapper;
import com.himma.envagent.module.knowledge.repository.row.DocumentChunkRow;
import com.himma.envagent.module.knowledge.vo.KnowledgePayloads.ChunkPayload;
import java.sql.SQLException;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import javax.sql.DataSource;
import org.springframework.stereotype.Repository;

@Repository
public class DocumentChunkRepository {

    private final DocumentChunkMapper documentChunkMapper;
    private final boolean postgres;

    public DocumentChunkRepository(DocumentChunkMapper documentChunkMapper, DataSource dataSource) throws SQLException {
        this.documentChunkMapper = documentChunkMapper;
        try (java.sql.Connection connection = dataSource.getConnection()) {
            this.postgres = connection.getMetaData().getDatabaseProductName().toLowerCase(Locale.ROOT).contains("postgres");
        }
    }

    public boolean supportsVectorSearch() {
        return postgres;
    }

    public void replaceChunks(long documentId, List<ChunkPayload> chunks) {
        // 全量替换：先清旧切片，再批量插入新切片。
        // 在 ingest 异常分支也会单独调用 deleteByDocumentId，二者协同保证状态一致。
        deleteByDocumentId(documentId);
        if (chunks.isEmpty()) {
            return;
        }
        for (ChunkPayload chunk : chunks) {
            DocumentChunkEntity entity = new DocumentChunkEntity();
            entity.setDocId(documentId);
            entity.setContent(chunk.content());
            entity.setChunkIndex(chunk.chunkIndex());
            entity.setTokenCount(chunk.tokenCount());
            entity.setEmbedding(chunk.embedding());
            // metadata 已经在上游序列化成 JSON 字符串，这里直接落库；Postgres 走 JSONB cast。
            entity.setMetadata(chunk.metadataJson());
            if (postgres) {
                documentChunkMapper.insertPostgres(entity);
            } else {
                documentChunkMapper.insertDefault(entity);
            }
        }
    }

    public void deleteByDocumentId(long documentId) {
        documentChunkMapper.delete(
                new LambdaQueryWrapper<DocumentChunkEntity>()
                        .eq(DocumentChunkEntity::getDocId, documentId)
        );
    }

    public long countAll() {
        Long count = documentChunkMapper.selectCount(new QueryWrapper<>());
        return count == null ? 0L : count;
    }

    public List<DocumentChunkRecord> searchByVector(String queryEmbedding, Collection<Long> kbIds, int limit) {
        return documentChunkMapper.searchByVector(queryEmbedding, kbIds, limit).stream()
                .map(this::toRecord)
                .toList();
    }

    public List<DocumentChunkRecord> findReadyChunks(Collection<Long> kbIds) {
        return documentChunkMapper.selectReadyChunks(kbIds).stream()
                .map(this::toRecord)
                .toList();
    }

    private DocumentChunkRecord toRecord(DocumentChunkRow row) {
        return new DocumentChunkRecord(
                row.getId(),
                row.getDocId(),
                row.getDocumentName(),
                row.getKbId(),
                row.getKbName(),
                row.getContent(),
                row.getChunkIndex() == null ? 0 : row.getChunkIndex(),
                row.getTokenCount() == null ? 0 : row.getTokenCount(),
                row.getEmbedding(),
                row.getScore() == null ? 0D : row.getScore()
        );
    }
}
