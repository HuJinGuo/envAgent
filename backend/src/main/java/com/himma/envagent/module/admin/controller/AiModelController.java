package com.himma.envagent.module.admin.controller;

import com.himma.envagent.common.api.ApiResponse;
import com.himma.envagent.module.admin.service.AiModelService;
import com.himma.envagent.module.admin.vo.AdminPayloads.ModelItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.ModelRequest;
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
@RequestMapping("/api/v1/admin/models")
public class AiModelController {

    private final AiModelService aiModelService;

    public AiModelController(AiModelService aiModelService) {
        this.aiModelService = aiModelService;
    }

    @GetMapping
    public ApiResponse<List<ModelItem>> list(Authentication authentication) {
        return ApiResponse.success(aiModelService.list(authentication));
    }

    @PostMapping
    public ApiResponse<ModelItem> create(Authentication authentication, @Valid @RequestBody ModelRequest request) {
        return ApiResponse.success(aiModelService.create(authentication, request));
    }

    @PutMapping("/{id}")
    public ApiResponse<ModelItem> update(Authentication authentication, @PathVariable Long id,
                                         @Valid @RequestBody ModelRequest request) {
        return ApiResponse.success(aiModelService.update(authentication, id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(Authentication authentication, @PathVariable Long id) {
        aiModelService.delete(authentication, id);
        return ApiResponse.success(null);
    }
}
