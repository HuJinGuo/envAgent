package com.himma.envagent.module.knowledge.repository;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.himma.envagent.module.knowledge.entity.KnowledgeBaseEntity;
import com.himma.envagent.module.knowledge.domain.KnowledgeBaseRecord;
import com.himma.envagent.module.knowledge.mapper.KnowledgeBaseMapper;
import com.himma.envagent.module.knowledge.repository.row.KnowledgeBaseSummaryRow;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class KnowledgeBaseRepository {

    private final KnowledgeBaseMapper knowledgeBaseMapper;

    public KnowledgeBaseRepository(KnowledgeBaseMapper knowledgeBaseMapper) {
        this.knowledgeBaseMapper = knowledgeBaseMapper;
    }

    public List<KnowledgeBaseRecord> findAll() {
        return knowledgeBaseMapper.selectSummaries().stream()
                .map(this::toRecord)
                .toList();
    }

    public Optional<KnowledgeBaseRecord> findById(Long id) {
        return Optional.ofNullable(knowledgeBaseMapper.selectSummaryById(id))
                .map(this::toRecord);
    }

    public void insertIfMissing(String code, String name, String description, int sortOrder) {
        Long count = knowledgeBaseMapper.selectCount(
                new LambdaQueryWrapper<KnowledgeBaseEntity>()
                        .eq(KnowledgeBaseEntity::getCode, code)
        );
        if (count != null && count > 0) {
            return;
        }
        KnowledgeBaseEntity entity = new KnowledgeBaseEntity();
        entity.setCode(code);
        entity.setName(name);
        entity.setDescription(description);
        entity.setSortOrder(sortOrder);
        knowledgeBaseMapper.insert(entity);
    }

    private KnowledgeBaseRecord toRecord(KnowledgeBaseSummaryRow row) {
        return new KnowledgeBaseRecord(
                row.getId(),
                row.getCode(),
                row.getName(),
                row.getDescription(),
                row.getSortOrder() == null ? 0 : row.getSortOrder(),
                row.getDocumentCount() == null ? 0L : row.getDocumentCount(),
                row.getCreatedAt(),
                row.getUpdatedAt()
        );
    }
}
