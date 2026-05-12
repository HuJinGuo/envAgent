package com.himma.envagent.module.workspace.controller;

import com.himma.envagent.common.api.ApiResponse;
import com.himma.envagent.module.auth.domain.UserRole;
import com.himma.envagent.module.auth.service.UserService;
import com.himma.envagent.module.workspace.service.WorkspaceAccessService;
import com.himma.envagent.module.workspace.service.WorkspaceService;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.AgentWorkspace;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.ChatWorkspace;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.DashboardSnapshot;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.KnowledgeWorkspace;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.MonitorWorkspace;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.SourceWorkspace;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.UsersWorkspace;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/workspaces")
public class WorkspaceController {

    private final WorkspaceService workspaceService;
    private final WorkspaceAccessService workspaceAccessService;
    private final UserService userService;

    public WorkspaceController(
            WorkspaceService workspaceService,
            WorkspaceAccessService workspaceAccessService,
            UserService userService
    ) {
        this.workspaceService = workspaceService;
        this.workspaceAccessService = workspaceAccessService;
        this.userService = userService;
    }

    @GetMapping("/dashboard")
    public ApiResponse<DashboardSnapshot> dashboard() {
        return ApiResponse.success(workspaceService.getDashboard());
    }

    @GetMapping("/chat")
    public ApiResponse<ChatWorkspace> chat(Authentication authentication) {
        Long userId = userService.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalStateException("current user not found"))
                .getId();
        return ApiResponse.success(workspaceService.getChatWorkspace(userId));
    }

    @GetMapping("/knowledge")
    public ApiResponse<KnowledgeWorkspace> knowledge(Authentication authentication) {
        workspaceAccessService.requireRoles(authentication, "知识库工作台", UserRole.ANALYST, UserRole.ADMIN);
        return ApiResponse.success(workspaceService.getKnowledgeWorkspace());
    }

    @GetMapping("/source")
    public ApiResponse<SourceWorkspace> source() {
        return ApiResponse.success(workspaceService.getSourceWorkspace());
    }

    @GetMapping("/agent")
    public ApiResponse<AgentWorkspace> agent(Authentication authentication) {
        workspaceAccessService.requireRoles(authentication, "Agent 任务工作台", UserRole.ANALYST, UserRole.ADMIN);
        return ApiResponse.success(workspaceService.getAgentWorkspace());
    }

    @GetMapping("/monitor")
    public ApiResponse<MonitorWorkspace> monitor(Authentication authentication) {
        workspaceAccessService.requireRoles(authentication, "系统监控工作台", UserRole.ADMIN);
        return ApiResponse.success(workspaceService.getMonitorWorkspace());
    }

    @GetMapping("/users")
    public ApiResponse<UsersWorkspace> users(Authentication authentication) {
        workspaceAccessService.requireRoles(authentication, "用户管理工作台", UserRole.ADMIN);
        return ApiResponse.success(workspaceService.getUsersWorkspace());
    }
}
