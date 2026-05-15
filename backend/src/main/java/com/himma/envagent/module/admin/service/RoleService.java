package com.himma.envagent.module.admin.service;

import com.himma.envagent.common.exception.BusinessException;
import com.himma.envagent.module.admin.entity.SysRoleEntity;
import com.himma.envagent.module.admin.repository.AdminRepository;
import com.himma.envagent.module.admin.service.support.AdminAccessSupport;
import com.himma.envagent.module.admin.vo.AdminPayloads.RoleItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.RoleRequest;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RoleService {

    private static final String RESOURCE = "角色管理";

    private final AdminRepository adminRepository;
    private final AdminAccessSupport access;

    public RoleService(AdminRepository adminRepository, AdminAccessSupport access) {
        this.adminRepository = adminRepository;
        this.access = access;
    }

    public List<RoleItem> list(Authentication authentication) {
        access.requireAdmin(authentication, RESOURCE);
        return adminRepository.roles().stream().map(this::toItem).toList();
    }

    @Transactional
    public RoleItem create(Authentication authentication, RoleRequest request) {
        access.requireAdmin(authentication, RESOURCE);
        return toItem(adminRepository.saveRole(apply(new SysRoleEntity(), request)));
    }

    @Transactional
    public RoleItem update(Authentication authentication, Long id, RoleRequest request) {
        access.requireAdmin(authentication, RESOURCE);
        SysRoleEntity entity = adminRepository.roleById(id).orElseThrow(() -> new BusinessException(404, "角色不存在"));
        return toItem(adminRepository.saveRole(apply(entity, request)));
    }

    @Transactional
    public void delete(Authentication authentication, Long id) {
        access.requireAdmin(authentication, RESOURCE);
        adminRepository.deleteRole(id);
    }

    @Transactional
    public void replaceMenus(Authentication authentication, Long id, List<Long> menuIds) {
        access.requireAdmin(authentication, RESOURCE);
        adminRepository.replaceRoleMenus(id, menuIds);
    }

    private static SysRoleEntity apply(SysRoleEntity entity, RoleRequest request) {
        entity.setCode(request.code());
        entity.setName(request.name());
        entity.setDescription(request.description());
        entity.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
        entity.setEnabled(request.enabled() == null || request.enabled());
        entity.setUpdatedAt(LocalDateTime.now());
        return entity;
    }

    private RoleItem toItem(SysRoleEntity entity) {
        return new RoleItem(entity.getId(), entity.getCode(), entity.getName(), entity.getDescription(),
                entity.getSortOrder(), entity.getEnabled(), adminRepository.menuIdsByRoleId(entity.getId()),
                entity.getCreatedAt(), entity.getUpdatedAt());
    }
}
