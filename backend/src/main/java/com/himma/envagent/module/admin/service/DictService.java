package com.himma.envagent.module.admin.service;

import com.himma.envagent.common.exception.BusinessException;
import com.himma.envagent.module.admin.entity.SysDictItemEntity;
import com.himma.envagent.module.admin.repository.AdminRepository;
import com.himma.envagent.module.admin.service.support.AdminAccessSupport;
import com.himma.envagent.module.admin.vo.AdminPayloads.DictItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.DictRequest;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DictService {

    private static final String RESOURCE = "业务字典";

    private final AdminRepository adminRepository;
    private final AdminAccessSupport access;

    public DictService(AdminRepository adminRepository, AdminAccessSupport access) {
        this.adminRepository = adminRepository;
        this.access = access;
    }

    public List<DictItem> list(Authentication authentication) {
        access.requireAdmin(authentication, RESOURCE);
        return adminRepository.dictItems().stream().map(DictService::toItem).toList();
    }

    @Transactional
    public DictItem create(Authentication authentication, DictRequest request) {
        access.requireAdmin(authentication, RESOURCE);
        adminRepository.dictItemByTypeAndValue(request.dictType().trim(), request.dictValue().trim())
                .ifPresent((item) -> {
                    throw new BusinessException(409, "同一字典类型下的字典值已存在");
                });
        return toItem(adminRepository.saveDictItem(apply(new SysDictItemEntity(), request)));
    }

    @Transactional
    public DictItem update(Authentication authentication, Long id, DictRequest request) {
        access.requireAdmin(authentication, RESOURCE);
        SysDictItemEntity entity = adminRepository.dictItemById(id).orElseThrow(() -> new BusinessException(404, "字典项不存在"));
        adminRepository.dictItemByTypeAndValue(request.dictType().trim(), request.dictValue().trim())
                .filter((item) -> !item.getId().equals(id))
                .ifPresent((item) -> {
                    throw new BusinessException(409, "同一字典类型下的字典值已存在");
                });
        return toItem(adminRepository.saveDictItem(apply(entity, request)));
    }

    @Transactional
    public void delete(Authentication authentication, Long id) {
        access.requireAdmin(authentication, RESOURCE);
        adminRepository.deleteDictItem(id);
    }

    private static SysDictItemEntity apply(SysDictItemEntity entity, DictRequest request) {
        entity.setDictType(request.dictType().trim());
        entity.setDictLabel(request.dictLabel().trim());
        entity.setDictValue(request.dictValue().trim());
        entity.setDescription(request.description());
        entity.setEnabled(request.enabled() == null || request.enabled());
        entity.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
        entity.setUpdatedAt(LocalDateTime.now());
        return entity;
    }

    private static DictItem toItem(SysDictItemEntity entity) {
        return new DictItem(entity.getId(), entity.getDictType(), entity.getDictLabel(), entity.getDictValue(),
                entity.getDescription(), entity.getEnabled(), entity.getSortOrder(), entity.getCreatedAt(), entity.getUpdatedAt());
    }
}
