package com.himma.envagent.module.knowledge.repository;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.himma.envagent.common.support.SnowflakeIdGenerator;
import com.himma.envagent.module.knowledge.domain.DocumentRecord;
import com.himma.envagent.module.knowledge.domain.DocumentStatus;
import com.himma.envagent.module.knowledge.entity.DocumentEntity;
import com.himma.envagent.module.knowledge.mapper.DocumentMapper;
import com.himma.envagent.module.knowledge.repository.row.DocumentRow;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class DocumentRepository {

    private final DocumentMapper documentMapper;
    private final SnowflakeIdGenerator snowflakeIdGenerator;

    public DocumentRepository(DocumentMapper documentMapper, SnowflakeIdGenerator snowflakeIdGenerator) {
        this.documentMapper = documentMapper;
        this.snowflakeIdGenerator = snowflakeIdGenerator;
    }

    public long insert(Long kbId, String filename, String contentType, String storagePath, long fileSize, Long createdBy) {
        // Repository 层负责把领域参数装配成 Entity，再交给 MyBatis-Plus 落库。
        DocumentEntity entity = new DocumentEntity();
        entity.setId(snowflakeIdGenerator.nextId());
        entity.setKbId(kbId);
        entity.setFilename(filename);
        entity.setContentType(contentType);
        entity.setStoragePath(storagePath);
        entity.setFileSize(fileSize);
        entity.setStatus(DocumentStatus.PENDING.name());
        entity.setChunkCount(0);
        entity.setCreatedBy(createdBy);
        documentMapper.insert(entity);
        return entity.getId() == null ? 0L : entity.getId();
    }

    public List<DocumentRecord> findAll() {
        // 这里不用纯 BaseMapper，是因为列表需要把知识库名称一起查出来。
        return documentMapper.selectDocumentRows().stream()
                .map(this::toRecord)
                .toList();
    }

    public Optional<DocumentRecord> findById(long id) {
        return Optional.ofNullable(documentMapper.selectDocumentRowById(id))
                .map(this::toRecord);
    }

    public long countAll() {
        Long count = documentMapper.selectCount(new QueryWrapper<>());
        return count == null ? 0L : count;
    }

    public long countByStatus(DocumentStatus status) {
        Long count = documentMapper.selectCount(
                new LambdaQueryWrapper<DocumentEntity>()
                        .eq(DocumentEntity::getStatus, status.name())
        );
        return count == null ? 0L : count;
    }

    public void updateStatus(long documentId, DocumentStatus status, int chunkCount, String errorMessage) {
        documentMapper.update(
                null,
                new LambdaUpdateWrapper<DocumentEntity>()
                        .eq(DocumentEntity::getId, documentId)
                        .set(DocumentEntity::getStatus, status.name())
                        .set(DocumentEntity::getChunkCount, chunkCount)
                        .set(DocumentEntity::getErrorMsg, errorMessage)
                        .setSql("updated_at = CURRENT_TIMESTAMP")
        );
    }

    public void touch(long documentId) {
        documentMapper.update(
                null,
                new LambdaUpdateWrapper<DocumentEntity>()
                        .eq(DocumentEntity::getId, documentId)
                        .setSql("updated_at = CURRENT_TIMESTAMP")
        );
    }

    public void delete(long documentId) {
        documentMapper.deleteById(documentId);
    }

    private DocumentRecord toRecord(DocumentRow row) {
        // Entity 更贴近表结构，Record 更贴近业务读取；这里做一次转换隔离。
        return new DocumentRecord(
                row.getId(),
                row.getKbId(),
                row.getKbName(),
                row.getFilename(),
                row.getContentType(),
                row.getStoragePath(),
                row.getFileSize() == null ? 0L : row.getFileSize(),
                DocumentStatus.valueOf(row.getStatus()),
                row.getChunkCount() == null ? 0 : row.getChunkCount(),
                row.getErrorMsg(),
                row.getCreatedBy(),
                row.getCreatedAt(),
                row.getUpdatedAt()
        );
    }
}
