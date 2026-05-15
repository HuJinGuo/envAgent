package com.himma.envagent.module.admin.controller;

import com.himma.envagent.common.api.ApiResponse;
import com.himma.envagent.module.admin.service.RoleService;
import com.himma.envagent.module.admin.vo.AdminPayloads.RoleItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.RoleMenusRequest;
import com.himma.envagent.module.admin.vo.AdminPayloads.RoleRequest;
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
@RequestMapping("/api/v1/admin/roles")
public class RoleController {

    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    @GetMapping
    public ApiResponse<List<RoleItem>> list(Authentication authentication) {
        return ApiResponse.success(roleService.list(authentication));
    }

    @PostMapping
    public ApiResponse<RoleItem> create(Authentication authentication, @Valid @RequestBody RoleRequest request) {
        return ApiResponse.success(roleService.create(authentication, request));
    }

    @PutMapping("/{id}")
    public ApiResponse<RoleItem> update(Authentication authentication, @PathVariable Long id,
                                        @Valid @RequestBody RoleRequest request) {
        return ApiResponse.success(roleService.update(authentication, id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(Authentication authentication, @PathVariable Long id) {
        roleService.delete(authentication, id);
        return ApiResponse.success(null);
    }

    @PutMapping("/{id}/menus")
    public ApiResponse<Void> replaceMenus(Authentication authentication, @PathVariable Long id,
                                          @Valid @RequestBody RoleMenusRequest request) {
        roleService.replaceMenus(authentication, id, request.menuIds());
        return ApiResponse.success(null);
    }
}
