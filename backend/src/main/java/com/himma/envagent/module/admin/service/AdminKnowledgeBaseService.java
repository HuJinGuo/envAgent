package com.himma.envagent.module.admin.service;

import com.himma.envagent.module.admin.entity.AdminKnowledgeBaseEntity;
import com.himma.envagent.module.admin.repository.AdminRepository;
import com.himma.envagent.module.admin.service.support.AdminAccessSupport;
import com.himma.envagent.module.admin.vo.AdminPayloads.KnowledgeBaseItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.KnowledgeBaseRequest;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminKnowledgeBaseService {

    private static final String RESOURCE = "知识库管理";

    private final AdminRepository adminRepository;
    private final AdminAccessSupport access;

    public AdminKnowledgeBaseService(AdminRepository adminRepository, AdminAccessSupport access) {
        this.adminRepository = adminRepository;
        this.access = access;
    }

    public List<KnowledgeBaseItem> list(Authentication authentication) {
        access.requireAdmin(authentication, RESOURCE);
        return adminRepository.knowledgeBases().stream().map(AdminKnowledgeBaseService::toItem).toList();
    }

    @Transactional
    public KnowledgeBaseItem create(Authentication authentication, KnowledgeBaseRequest request) {
        access.requireAdmin(authentication, RESOURCE);
        return toItem(adminRepository.saveKnowledgeBase(apply(new AdminKnowledgeBaseEntity(), request)));
    }

    @Transactional
    public KnowledgeBaseItem update(Authentication authentication, Long id, KnowledgeBaseRequest request) {
        access.requireAdmin(authentication, RESOURCE);
        AdminKnowledgeBaseEntity entity = new AdminKnowledgeBaseEntity();
        entity.setId(id);
        return toItem(adminRepository.saveKnowledgeBase(apply(entity, request)));
    }

    @Transactional
    public void delete(Authentication authentication, Long id) {
        access.requireAdmin(authentication, RESOURCE);
        adminRepository.deleteKnowledgeBase(id);
    }

    private static AdminKnowledgeBaseEntity apply(AdminKnowledgeBaseEntity entity, KnowledgeBaseRequest request) {
        entity.setCode(request.code());
        entity.setName(request.name());
        entity.setDescription(request.description());
        entity.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
        entity.setCreatedBy(request.createdBy());
        entity.setUpdatedAt(LocalDateTime.now());
        return entity;
    }

    private static KnowledgeBaseItem toItem(AdminKnowledgeBaseEntity entity) {
        return new KnowledgeBaseItem(entity.getId(), entity.getCode(), entity.getName(), entity.getDescription(),
                entity.getSortOrder(), entity.getCreatedBy(), entity.getCreatedAt(), entity.getUpdatedAt());
    }
}
