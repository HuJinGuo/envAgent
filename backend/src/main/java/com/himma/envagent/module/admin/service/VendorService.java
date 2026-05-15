package com.himma.envagent.module.admin.service;

import com.himma.envagent.common.exception.BusinessException;
import com.himma.envagent.module.admin.entity.ModelVendorEntity;
import com.himma.envagent.module.admin.repository.AdminRepository;
import com.himma.envagent.module.admin.service.support.AdminAccessSupport;
import com.himma.envagent.module.admin.vo.AdminPayloads.VendorItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.VendorRequest;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VendorService {

    private static final String RESOURCE = "厂商管理";

    private final AdminRepository adminRepository;
    private final AdminAccessSupport access;

    public VendorService(AdminRepository adminRepository, AdminAccessSupport access) {
        this.adminRepository = adminRepository;
        this.access = access;
    }

    public List<VendorItem> list(Authentication authentication) {
        access.requireAdmin(authentication, RESOURCE);
        return adminRepository.vendors().stream().map(VendorService::toItem).toList();
    }

    @Transactional
    public VendorItem create(Authentication authentication, VendorRequest request) {
        access.requireAdmin(authentication, RESOURCE);
        return toItem(adminRepository.saveVendor(apply(new ModelVendorEntity(), request)));
    }

    @Transactional
    public VendorItem update(Authentication authentication, Long id, VendorRequest request) {
        access.requireAdmin(authentication, RESOURCE);
        ModelVendorEntity entity = adminRepository.vendorById(id)
                .orElseThrow(() -> new BusinessException(404, "厂商不存在"));
        return toItem(adminRepository.saveVendor(apply(entity, request)));
    }

    @Transactional
    public void delete(Authentication authentication, Long id) {
        access.requireAdmin(authentication, RESOURCE);
        adminRepository.deleteVendor(id);
    }

    private static ModelVendorEntity apply(ModelVendorEntity entity, VendorRequest request) {
        entity.setCode(request.code());
        entity.setName(request.name());
        entity.setBaseUrl(request.baseUrl());
        if (request.apiKey() != null && !request.apiKey().isBlank()) {
            String normalizedApiKey = request.apiKey().trim();
            entity.setApiKey(normalizedApiKey);
            entity.setApiKeyMasked(maskApiKey(normalizedApiKey));
        }
        entity.setDescription(request.description());
        entity.setEnabled(request.enabled() == null || request.enabled());
        entity.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
        entity.setUpdatedAt(LocalDateTime.now());
        return entity;
    }

    private static VendorItem toItem(ModelVendorEntity entity) {
        return new VendorItem(entity.getId(), entity.getCode(), entity.getName(), entity.getBaseUrl(),
                entity.getApiKeyMasked(), entity.getDescription(), entity.getEnabled(), entity.getSortOrder(),
                entity.getCreatedAt(), entity.getUpdatedAt());
    }

    private static String maskApiKey(String apiKey) {
        String normalized = apiKey == null ? "" : apiKey.trim();
        if (normalized.isEmpty()) {
            return null;
        }
        if (normalized.length() <= 8) {
            return normalized.charAt(0) + "***" + normalized.charAt(normalized.length() - 1);
        }
        return normalized.substring(0, 3) + "****" + normalized.substring(normalized.length() - 4);
    }
}
