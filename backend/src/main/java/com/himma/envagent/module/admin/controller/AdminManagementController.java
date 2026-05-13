package com.himma.envagent.module.admin.controller;

import com.himma.envagent.common.api.ApiResponse;
import com.himma.envagent.module.admin.service.AdminManagementService;
import com.himma.envagent.module.admin.vo.AdminPayloads.KnowledgeBaseItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.KnowledgeBaseRequest;
import com.himma.envagent.module.admin.vo.AdminPayloads.MenuItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.MenuRequest;
import com.himma.envagent.module.admin.vo.AdminPayloads.MenuTreeItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.ModelItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.ModelRequest;
import com.himma.envagent.module.admin.vo.AdminPayloads.RoleItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.RoleMenusRequest;
import com.himma.envagent.module.admin.vo.AdminPayloads.RoleRequest;
import com.himma.envagent.module.admin.vo.AdminPayloads.VendorItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.VendorRequest;
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
@RequestMapping("/api/v1/admin")
public class AdminManagementController {

    private final AdminManagementService adminManagementService;

    public AdminManagementController(AdminManagementService adminManagementService) {
        this.adminManagementService = adminManagementService;
    }

    @GetMapping("/roles")
    public ApiResponse<List<RoleItem>> roles(Authentication authentication) {
        return ApiResponse.success(adminManagementService.listRoles(authentication));
    }

    @PostMapping("/roles")
    public ApiResponse<RoleItem> createRole(Authentication authentication, @Valid @RequestBody RoleRequest request) {
        return ApiResponse.success(adminManagementService.createRole(authentication, request));
    }

    @PutMapping("/roles/{id}")
    public ApiResponse<RoleItem> updateRole(Authentication authentication, @PathVariable Long id,
                                            @Valid @RequestBody RoleRequest request) {
        return ApiResponse.success(adminManagementService.updateRole(authentication, id, request));
    }

    @DeleteMapping("/roles/{id}")
    public ApiResponse<Void> deleteRole(Authentication authentication, @PathVariable Long id) {
        adminManagementService.deleteRole(authentication, id);
        return ApiResponse.success(null);
    }

    @PutMapping("/roles/{id}/menus")
    public ApiResponse<Void> replaceRoleMenus(Authentication authentication, @PathVariable Long id,
                                              @Valid @RequestBody RoleMenusRequest request) {
        adminManagementService.replaceRoleMenus(authentication, id, request.menuIds());
        return ApiResponse.success(null);
    }

    @GetMapping("/menus")
    public ApiResponse<List<MenuTreeItem>> menus(Authentication authentication) {
        return ApiResponse.success(adminManagementService.listMenus(authentication));
    }

    @PostMapping("/menus")
    public ApiResponse<MenuItem> createMenu(Authentication authentication, @Valid @RequestBody MenuRequest request) {
        return ApiResponse.success(adminManagementService.createMenu(authentication, request));
    }

    @PutMapping("/menus/{id}")
    public ApiResponse<MenuItem> updateMenu(Authentication authentication, @PathVariable Long id,
                                            @Valid @RequestBody MenuRequest request) {
        return ApiResponse.success(adminManagementService.updateMenu(authentication, id, request));
    }

    @DeleteMapping("/menus/{id}")
    public ApiResponse<Void> deleteMenu(Authentication authentication, @PathVariable Long id) {
        adminManagementService.deleteMenu(authentication, id);
        return ApiResponse.success(null);
    }

    @GetMapping({"/navigation", "/menus/navigation"})
    public ApiResponse<List<MenuTreeItem>> navigation(Authentication authentication) {
        return ApiResponse.success(adminManagementService.navigation(authentication));
    }

    @GetMapping("/vendors")
    public ApiResponse<List<VendorItem>> vendors(Authentication authentication) {
        return ApiResponse.success(adminManagementService.listVendors(authentication));
    }

    @PostMapping("/vendors")
    public ApiResponse<VendorItem> createVendor(Authentication authentication, @Valid @RequestBody VendorRequest request) {
        return ApiResponse.success(adminManagementService.createVendor(authentication, request));
    }

    @PutMapping("/vendors/{id}")
    public ApiResponse<VendorItem> updateVendor(Authentication authentication, @PathVariable Long id,
                                                @Valid @RequestBody VendorRequest request) {
        return ApiResponse.success(adminManagementService.updateVendor(authentication, id, request));
    }

    @DeleteMapping("/vendors/{id}")
    public ApiResponse<Void> deleteVendor(Authentication authentication, @PathVariable Long id) {
        adminManagementService.deleteVendor(authentication, id);
        return ApiResponse.success(null);
    }

    @GetMapping("/models")
    public ApiResponse<List<ModelItem>> models(Authentication authentication) {
        return ApiResponse.success(adminManagementService.listModels(authentication));
    }

    @PostMapping("/models")
    public ApiResponse<ModelItem> createModel(Authentication authentication, @Valid @RequestBody ModelRequest request) {
        return ApiResponse.success(adminManagementService.createModel(authentication, request));
    }

    @PutMapping("/models/{id}")
    public ApiResponse<ModelItem> updateModel(Authentication authentication, @PathVariable Long id,
                                              @Valid @RequestBody ModelRequest request) {
        return ApiResponse.success(adminManagementService.updateModel(authentication, id, request));
    }

    @DeleteMapping("/models/{id}")
    public ApiResponse<Void> deleteModel(Authentication authentication, @PathVariable Long id) {
        adminManagementService.deleteModel(authentication, id);
        return ApiResponse.success(null);
    }

    @GetMapping("/knowledge-bases")
    public ApiResponse<List<KnowledgeBaseItem>> knowledgeBases(Authentication authentication) {
        return ApiResponse.success(adminManagementService.listKnowledgeBases(authentication));
    }

    @PostMapping("/knowledge-bases")
    public ApiResponse<KnowledgeBaseItem> createKnowledgeBase(Authentication authentication,
                                                              @Valid @RequestBody KnowledgeBaseRequest request) {
        return ApiResponse.success(adminManagementService.createKnowledgeBase(authentication, request));
    }

    @PutMapping("/knowledge-bases/{id}")
    public ApiResponse<KnowledgeBaseItem> updateKnowledgeBase(Authentication authentication, @PathVariable Long id,
                                                              @Valid @RequestBody KnowledgeBaseRequest request) {
        return ApiResponse.success(adminManagementService.updateKnowledgeBase(authentication, id, request));
    }

    @DeleteMapping("/knowledge-bases/{id}")
    public ApiResponse<Void> deleteKnowledgeBase(Authentication authentication, @PathVariable Long id) {
        adminManagementService.deleteKnowledgeBase(authentication, id);
        return ApiResponse.success(null);
    }
}
