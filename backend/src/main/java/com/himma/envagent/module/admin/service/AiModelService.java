package com.himma.envagent.module.admin.service;

import com.himma.envagent.common.exception.BusinessException;
import com.himma.envagent.module.admin.entity.AiModelEntity;
import com.himma.envagent.module.admin.entity.ModelVendorEntity;
import com.himma.envagent.module.admin.repository.AdminRepository;
import com.himma.envagent.module.admin.service.support.AdminAccessSupport;
import com.himma.envagent.module.admin.vo.AdminPayloads.ModelItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.ModelRequest;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiModelService {

    private static final String RESOURCE = "AI 模型管理";

    private final AdminRepository adminRepository;
    private final AdminAccessSupport access;

    public AiModelService(AdminRepository adminRepository, AdminAccessSupport access) {
        this.adminRepository = adminRepository;
        this.access = access;
    }

    public List<ModelItem> list(Authentication authentication) {
        access.requireAdmin(authentication, RESOURCE);
        return adminRepository.models().stream().map(this::toItem).toList();
    }

    @Transactional
    public ModelItem create(Authentication authentication, ModelRequest request) {
        access.requireAdmin(authentication, RESOURCE);
        return toItem(adminRepository.saveModel(apply(new AiModelEntity(), request)));
    }

    @Transactional
    public ModelItem update(Authentication authentication, Long id, ModelRequest request) {
        access.requireAdmin(authentication, RESOURCE);
        AiModelEntity entity = adminRepository.modelById(id)
                .orElseThrow(() -> new BusinessException(404, "模型不存在"));
        return toItem(adminRepository.saveModel(apply(entity, request)));
    }

    @Transactional
    public void delete(Authentication authentication, Long id) {
        access.requireAdmin(authentication, RESOURCE);
        adminRepository.deleteModel(id);
    }

    private static AiModelEntity apply(AiModelEntity entity, ModelRequest request) {
        entity.setVendorId(request.vendorId());
        entity.setCode(request.code());
        entity.setName(request.name());
        entity.setModelType(request.modelType() == null ? "CHAT" : request.modelType());
        entity.setContextWindow(request.contextWindow());
        entity.setMaxOutputTokens(request.maxOutputTokens());
        entity.setEnabled(request.enabled() == null || request.enabled());
        entity.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
        entity.setUpdatedAt(LocalDateTime.now());
        return entity;
    }

    private ModelItem toItem(AiModelEntity entity) {
        String vendorName = adminRepository.vendorById(entity.getVendorId()).map(ModelVendorEntity::getName).orElse("");
        return new ModelItem(entity.getId(), entity.getVendorId(), vendorName, entity.getCode(), entity.getName(),
                entity.getModelType(), entity.getContextWindow(), entity.getMaxOutputTokens(), entity.getEnabled(),
                entity.getSortOrder(), entity.getCreatedAt(), entity.getUpdatedAt());
    }
}
