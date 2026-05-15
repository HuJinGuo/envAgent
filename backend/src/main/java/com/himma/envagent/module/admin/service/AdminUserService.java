package com.himma.envagent.module.admin.service;

import com.himma.envagent.common.exception.BusinessException;
import com.himma.envagent.module.admin.entity.SysRoleEntity;
import com.himma.envagent.module.admin.repository.AdminRepository;
import com.himma.envagent.module.admin.service.support.AdminAccessSupport;
import com.himma.envagent.module.admin.vo.AdminPayloads.UserItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.UserRequest;
import com.himma.envagent.module.auth.domain.UserEntity;
import com.himma.envagent.module.auth.domain.UserStatus;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminUserService {

    private static final String RESOURCE = "用户管理";

    private final AdminRepository adminRepository;
    private final AdminAccessSupport access;
    private final PasswordEncoder passwordEncoder;

    public AdminUserService(AdminRepository adminRepository, AdminAccessSupport access, PasswordEncoder passwordEncoder) {
        this.adminRepository = adminRepository;
        this.access = access;
        this.passwordEncoder = passwordEncoder;
    }

    public List<UserItem> list(Authentication authentication) {
        access.requireAdmin(authentication, RESOURCE);
        return adminRepository.users().stream().map(this::toItem).toList();
    }

    @Transactional
    public UserItem create(Authentication authentication, UserRequest request) {
        access.requireAdmin(authentication, RESOURCE);
        adminRepository.userByUsername(request.username()).ifPresent((user) -> {
            throw new BusinessException(409, "用户名已存在");
        });
        return toItem(adminRepository.saveUser(apply(new UserEntity(), request, true)));
    }

    @Transactional
    public UserItem update(Authentication authentication, Long id, UserRequest request) {
        access.requireAdmin(authentication, RESOURCE);
        UserEntity entity = adminRepository.userById(id).orElseThrow(() -> new BusinessException(404, "用户不存在"));
        adminRepository.userByUsername(request.username())
                .filter((user) -> !user.getId().equals(id))
                .ifPresent((user) -> {
                    throw new BusinessException(409, "用户名已存在");
                });
        return toItem(adminRepository.saveUser(apply(entity, request, false)));
    }

    @Transactional
    public void delete(Authentication authentication, Long id) {
        access.requireAdmin(authentication, RESOURCE);
        adminRepository.deleteUser(id);
    }

    private UserEntity apply(UserEntity entity, UserRequest request, boolean createMode) {
        entity.setUsername(request.username());
        entity.setRole(request.roleCode());
        entity.setDept(request.dept());
        entity.setStatus((request.status() == null || request.status().isBlank()) ? UserStatus.ACTIVE.name() : request.status());
        if (createMode) {
            String rawPassword = (request.password() == null || request.password().isBlank()) ? "Env@123456" : request.password();
            entity.setPasswordHash(passwordEncoder.encode(rawPassword));
            entity.setCreatedAt(LocalDateTime.now());
        } else if (request.password() != null && !request.password().isBlank()) {
            entity.setPasswordHash(passwordEncoder.encode(request.password()));
        }
        entity.setUpdatedAt(LocalDateTime.now());
        return entity;
    }

    private UserItem toItem(UserEntity entity) {
        String roleName = adminRepository.roleByCode(entity.getRole())
                .map(SysRoleEntity::getName)
                .orElse(entity.getRole());
        return new UserItem(entity.getId(), entity.getUsername(), entity.getRole(), roleName, entity.getDept(),
                entity.getStatus(), entity.getLastLoginAt(), entity.getCreatedAt(), entity.getUpdatedAt());
    }
}
