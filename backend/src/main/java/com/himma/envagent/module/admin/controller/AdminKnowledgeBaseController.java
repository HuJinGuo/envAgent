package com.himma.envagent.module.admin.controller;

import com.himma.envagent.common.api.ApiResponse;
import com.himma.envagent.module.admin.service.AdminKnowledgeBaseService;
import com.himma.envagent.module.admin.vo.AdminPayloads.KnowledgeBaseItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.KnowledgeBaseRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/knowledge-bases")
public class AdminKnowledgeBaseController {

    private final AdminKnowledgeBaseService adminKnowledgeBaseService;

    public AdminKnowledgeBaseController(AdminKnowledgeBaseService adminKnowledgeBaseService) {
        this.adminKnowledgeBaseService = adminKnowledgeBaseService;
    }

    @GetMapping
    public ApiResponse<List<KnowledgeBaseItem>> list(Authentication authentication) {
        return ApiResponse.success(adminKnowledgeBaseService.list(authentication));
    }

    @PostMapping
    public ApiResponse<KnowledgeBaseItem> create(Authentication authentication,
                                                 @Valid @RequestBody KnowledgeBaseRequest request) {
        return ApiResponse.success(adminKnowledgeBaseService.create(authentication, request));
    }

    @PutMapping("/{id}")
    public ApiResponse<KnowledgeBaseItem> update(Authentication authentication, @PathVariable Long id,
                                                 @Valid @RequestBody KnowledgeBaseRequest request) {
        return ApiResponse.success(adminKnowledgeBaseService.update(authentication, id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(Authentication authentication, @PathVariable Long id) {
        adminKnowledgeBaseService.delete(authentication, id);
        return ApiResponse.success(null);
    }
}
