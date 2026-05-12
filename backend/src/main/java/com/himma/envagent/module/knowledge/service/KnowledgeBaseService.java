package com.himma.envagent.module.knowledge.service;

import com.himma.envagent.module.knowledge.domain.KnowledgeBaseRecord;
import com.himma.envagent.module.knowledge.repository.KnowledgeBaseRepository;
import com.himma.envagent.module.knowledge.vo.KnowledgePayloads.KnowledgeBaseItem;
import jakarta.annotation.PostConstruct;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class KnowledgeBaseService {

    private final KnowledgeBaseRepository knowledgeBaseRepository;

    public KnowledgeBaseService(KnowledgeBaseRepository knowledgeBaseRepository) {
        this.knowledgeBaseRepository = knowledgeBaseRepository;
    }

    @PostConstruct
    public void ensureDefaults() {
        knowledgeBaseRepository.insertIfMissing("law", "法规标准", "环境法律、标准与规范", 10);
        knowledgeBaseRepository.insertIfMissing("permit", "许可证", "排污许可证及附件材料", 20);
        knowledgeBaseRepository.insertIfMissing("monitor", "监测日报", "在线监测、日报与统计材料", 30);
        knowledgeBaseRepository.insertIfMissing("internal", "内部文件", "制度、预案与内部资料", 40);
        knowledgeBaseRepository.insertIfMissing("other", "未分类", "未指定分类的上传文档", 50);
    }

    public List<KnowledgeBaseItem> list() {
        return knowledgeBaseRepository.findAll().stream()
                .map(this::toItem)
                .toList();
    }

    public List<KnowledgeBaseRecord> listRecords() {
        return knowledgeBaseRepository.findAll();
    }

    private KnowledgeBaseItem toItem(KnowledgeBaseRecord record) {
        return new KnowledgeBaseItem(
                record.id(),
                record.code(),
                record.name(),
                record.description(),
                record.documentCount()
        );
    }
}
