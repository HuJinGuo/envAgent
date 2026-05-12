package com.himma.envagent.module.knowledge.controller;

import com.himma.envagent.common.api.ApiResponse;
import com.himma.envagent.module.auth.domain.UserRole;
import com.himma.envagent.module.knowledge.service.KnowledgeBaseService;
import com.himma.envagent.module.knowledge.vo.KnowledgePayloads.KnowledgeBaseItem;
import com.himma.envagent.module.workspace.service.WorkspaceAccessService;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/knowledge-bases")
public class KnowledgeBaseController {

    private final KnowledgeBaseService knowledgeBaseService;
    private final WorkspaceAccessService workspaceAccessService;

    public KnowledgeBaseController(
            KnowledgeBaseService knowledgeBaseService,
            WorkspaceAccessService workspaceAccessService
    ) {
        this.knowledgeBaseService = knowledgeBaseService;
        this.workspaceAccessService = workspaceAccessService;
    }

    @GetMapping
    public ApiResponse<List<KnowledgeBaseItem>> list(Authentication authentication) {
        workspaceAccessService.requireRoles(authentication, "知识库分类接口", UserRole.ANALYST, UserRole.ADMIN);
        return ApiResponse.success(knowledgeBaseService.list());
    }
}
