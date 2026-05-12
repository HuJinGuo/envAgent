package com.himma.envagent.module.workspace.service;

import com.himma.envagent.common.exception.ForbiddenException;
import com.himma.envagent.module.auth.domain.UserRole;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
public class WorkspaceAccessService {

    public void requireRoles(Authentication authentication, String workspaceLabel, UserRole... roles) {
        Set<String> allowedAuthorities = Arrays.stream(roles)
                .map(role -> "ROLE_" + role.name())
                .collect(Collectors.toSet());
        boolean granted = authentication.getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .anyMatch(allowedAuthorities::contains);
        if (!granted) {
            throw new ForbiddenException(40301, describeRole(authentication) + "无权访问" + workspaceLabel);
        }
    }

    private String describeRole(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .filter(authority -> authority.startsWith("ROLE_"))
                .map(authority -> authority.substring(5))
                .findFirst()
                .map(this::toRoleLabel)
                .orElse("当前角色");
    }

    private String toRoleLabel(String roleCode) {
        return switch (roleCode) {
            case "INSPECTOR" -> "执法人员";
            case "ANALYST" -> "监测分析员";
            case "ADMIN" -> "管理层";
            default -> "当前角色";
        };
    }
}
