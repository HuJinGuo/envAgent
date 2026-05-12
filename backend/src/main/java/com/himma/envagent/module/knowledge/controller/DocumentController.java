package com.himma.envagent.module.knowledge.controller;

import com.himma.envagent.common.api.ApiResponse;
import com.himma.envagent.common.exception.BusinessException;
import com.himma.envagent.module.auth.domain.UserRole;
import com.himma.envagent.module.auth.domain.UserEntity;
import com.himma.envagent.module.auth.service.UserService;
import com.himma.envagent.module.knowledge.service.DocumentService;
import com.himma.envagent.module.knowledge.vo.KnowledgePayloads.DocumentItem;
import com.himma.envagent.module.knowledge.vo.KnowledgePayloads.DocumentStatusItem;
import com.himma.envagent.module.knowledge.vo.KnowledgePayloads.UploadDocumentResponse;
import com.himma.envagent.module.workspace.service.WorkspaceAccessService;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/documents")
public class DocumentController {

    private final DocumentService documentService;
    private final UserService userService;
    private final WorkspaceAccessService workspaceAccessService;

    public DocumentController(
            DocumentService documentService,
            UserService userService,
            WorkspaceAccessService workspaceAccessService
    ) {
        this.documentService = documentService;
        this.userService = userService;
        this.workspaceAccessService = workspaceAccessService;
    }

    @GetMapping
    public ApiResponse<List<DocumentItem>> list(Authentication authentication) {
        workspaceAccessService.requireRoles(authentication, "知识库文档接口", UserRole.ANALYST, UserRole.ADMIN);
        return ApiResponse.success(documentService.list());
    }

    @PostMapping("/upload")
    public ApiResponse<UploadDocumentResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "kbId", required = false) Long kbId,
            Authentication authentication
    ) {
        workspaceAccessService.requireRoles(authentication, "知识库上传接口", UserRole.ANALYST, UserRole.ADMIN);
        UserEntity user = userService.findByUsername(authentication.getName())
                .orElseThrow(() -> new BusinessException(401, "当前用户不存在"));
        return ApiResponse.success(documentService.upload(file, kbId, user.getId()));
    }

    @GetMapping("/{id}")
    public ApiResponse<DocumentItem> get(@PathVariable("id") long documentId, Authentication authentication) {
        workspaceAccessService.requireRoles(authentication, "知识库文档详情接口", UserRole.ANALYST, UserRole.ADMIN);
        return ApiResponse.success(documentService.get(documentId));
    }

    @GetMapping("/{id}/status")
    public ApiResponse<DocumentStatusItem> status(@PathVariable("id") long documentId, Authentication authentication) {
        workspaceAccessService.requireRoles(authentication, "知识库文档状态接口", UserRole.ANALYST, UserRole.ADMIN);
        return ApiResponse.success(documentService.getStatus(documentId));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable("id") long documentId, Authentication authentication) {
        workspaceAccessService.requireRoles(authentication, "知识库删除接口", UserRole.ANALYST, UserRole.ADMIN);
        documentService.delete(documentId);
        return ApiResponse.success(null);
    }
}
