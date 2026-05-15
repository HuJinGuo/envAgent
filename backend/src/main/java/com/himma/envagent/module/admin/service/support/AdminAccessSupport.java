package com.himma.envagent.module.admin.service.support;

import com.himma.envagent.common.exception.BusinessException;
import com.himma.envagent.module.auth.domain.UserRole;
import com.himma.envagent.module.workspace.service.WorkspaceAccessService;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/**
 * 所有 admin 子服务公用的权限校验入口。提取出来避免每个 service 都重复写一次 requireAdmin。
 */
@Component
public class AdminAccessSupport {

    private final WorkspaceAccessService workspaceAccessService;

    public AdminAccessSupport(WorkspaceAccessService workspaceAccessService) {
        this.workspaceAccessService = workspaceAccessService;
    }

    public void requireAdmin(Authentication authentication, String resource) {
        workspaceAccessService.requireRoles(authentication, resource, UserRole.ADMIN);
    }

    public String currentRole(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .filter(authority -> authority.startsWith("ROLE_"))
                .map(authority -> authority.substring(5))
                .findFirst()
                .orElseThrow(() -> new BusinessException(403, "当前用户未分配角色"));
    }
}
