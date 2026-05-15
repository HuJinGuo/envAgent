package com.himma.envagent.module.admin.controller;

import com.himma.envagent.common.api.ApiResponse;
import com.himma.envagent.module.admin.service.AdminUserService;
import com.himma.envagent.module.admin.vo.AdminPayloads.UserItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.UserRequest;
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
@RequestMapping("/api/v1/admin/users")
public class AdminUserController {

    private final AdminUserService adminUserService;

    public AdminUserController(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    @GetMapping
    public ApiResponse<List<UserItem>> list(Authentication authentication) {
        return ApiResponse.success(adminUserService.list(authentication));
    }

    @PostMapping
    public ApiResponse<UserItem> create(Authentication authentication, @Valid @RequestBody UserRequest request) {
        return ApiResponse.success(adminUserService.create(authentication, request));
    }

    @PutMapping("/{id}")
    public ApiResponse<UserItem> update(Authentication authentication, @PathVariable Long id,
                                        @Valid @RequestBody UserRequest request) {
        return ApiResponse.success(adminUserService.update(authentication, id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(Authentication authentication, @PathVariable Long id) {
        adminUserService.delete(authentication, id);
        return ApiResponse.success(null);
    }
}
