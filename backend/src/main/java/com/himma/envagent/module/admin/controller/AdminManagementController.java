package com.himma.envagent.module.admin.controller;

import com.himma.envagent.common.api.ApiResponse;
import com.himma.envagent.module.admin.service.AdminManagementService;
import com.himma.envagent.module.admin.vo.AdminPayloads.DictItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.DictRequest;
import com.himma.envagent.module.admin.vo.AdminPayloads.KnowledgeBaseItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.KnowledgeBaseRequest;
import com.himma.envagent.module.admin.vo.AdminPayloads.MenuItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.MenuRequest;
import com.himma.envagent.module.admin.vo.AdminPayloads.MenuTreeItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.MonitorDataItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.MonitorDataRangeRequest;
import com.himma.envagent.module.admin.vo.AdminPayloads.MonitorDataRequest;
import com.himma.envagent.module.admin.vo.AdminPayloads.MonitorDataSimulateRequest;
import com.himma.envagent.module.admin.vo.AdminPayloads.ModelItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.ModelRequest;
import com.himma.envagent.module.admin.vo.AdminPayloads.RoleItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.RoleMenusRequest;
import com.himma.envagent.module.admin.vo.AdminPayloads.RoleRequest;
import com.himma.envagent.module.admin.vo.AdminPayloads.StationItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.StationRequest;
import com.himma.envagent.module.admin.vo.AdminPayloads.ToolItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.ToolRequest;
import com.himma.envagent.module.admin.vo.AdminPayloads.ToolRolesRequest;
import com.himma.envagent.module.admin.vo.AdminPayloads.ToolSearchRequest;
import com.himma.envagent.module.admin.vo.AdminPayloads.ToolSearchResultItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.UserItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.UserRequest;
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

    @GetMapping("/users")
    public ApiResponse<List<UserItem>> users(Authentication authentication) {
        return ApiResponse.success(adminManagementService.listUsers(authentication));
    }

    @GetMapping("/dict-items")
    public ApiResponse<List<DictItem>> dictItems(Authentication authentication) {
        return ApiResponse.success(adminManagementService.listDictItems(authentication));
    }

    @PostMapping("/dict-items")
    public ApiResponse<DictItem> createDictItem(Authentication authentication, @Valid @RequestBody DictRequest request) {
        return ApiResponse.success(adminManagementService.createDictItem(authentication, request));
    }

    @PutMapping("/dict-items/{id}")
    public ApiResponse<DictItem> updateDictItem(Authentication authentication, @PathVariable Long id,
                                                @Valid @RequestBody DictRequest request) {
        return ApiResponse.success(adminManagementService.updateDictItem(authentication, id, request));
    }

    @DeleteMapping("/dict-items/{id}")
    public ApiResponse<Void> deleteDictItem(Authentication authentication, @PathVariable Long id) {
        adminManagementService.deleteDictItem(authentication, id);
        return ApiResponse.success(null);
    }

    @PostMapping("/users")
    public ApiResponse<UserItem> createUser(Authentication authentication, @Valid @RequestBody UserRequest request) {
        return ApiResponse.success(adminManagementService.createUser(authentication, request));
    }

    @PutMapping("/users/{id}")
    public ApiResponse<UserItem> updateUser(Authentication authentication, @PathVariable Long id,
                                            @Valid @RequestBody UserRequest request) {
        return ApiResponse.success(adminManagementService.updateUser(authentication, id, request));
    }

    @DeleteMapping("/users/{id}")
    public ApiResponse<Void> deleteUser(Authentication authentication, @PathVariable Long id) {
        adminManagementService.deleteUser(authentication, id);
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

    @GetMapping("/tools")
    public ApiResponse<List<ToolItem>> tools(Authentication authentication) {
        return ApiResponse.success(adminManagementService.listTools(authentication));
    }

    @PostMapping("/tools")
    public ApiResponse<ToolItem> createTool(Authentication authentication, @Valid @RequestBody ToolRequest request) {
        return ApiResponse.success(adminManagementService.createTool(authentication, request));
    }

    @PutMapping("/tools/{id}")
    public ApiResponse<ToolItem> updateTool(Authentication authentication, @PathVariable Long id,
                                            @Valid @RequestBody ToolRequest request) {
        return ApiResponse.success(adminManagementService.updateTool(authentication, id, request));
    }

    @DeleteMapping("/tools/{id}")
    public ApiResponse<Void> deleteTool(Authentication authentication, @PathVariable Long id) {
        adminManagementService.deleteTool(authentication, id);
        return ApiResponse.success(null);
    }

    @PutMapping("/tools/{id}/roles")
    public ApiResponse<Void> replaceToolRoles(Authentication authentication, @PathVariable Long id,
                                              @Valid @RequestBody ToolRolesRequest request) {
        adminManagementService.replaceToolRoles(authentication, id, request.roleIds());
        return ApiResponse.success(null);
    }

    @PostMapping("/tools/test-search")
    public ApiResponse<List<ToolSearchResultItem>> testSearchTools(Authentication authentication,
                                                                   @Valid @RequestBody ToolSearchRequest request) {
        return ApiResponse.success(adminManagementService.testSearchTools(authentication, request));
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

    @GetMapping("/stations")
    public ApiResponse<List<StationItem>> stations(Authentication authentication) {
        return ApiResponse.success(adminManagementService.listStations(authentication));
    }

    @PostMapping("/stations")
    public ApiResponse<StationItem> createStation(Authentication authentication, @Valid @RequestBody StationRequest request) {
        return ApiResponse.success(adminManagementService.createStation(authentication, request));
    }

    @PutMapping("/stations/{id}")
    public ApiResponse<StationItem> updateStation(Authentication authentication, @PathVariable Long id,
                                                  @Valid @RequestBody StationRequest request) {
        return ApiResponse.success(adminManagementService.updateStation(authentication, id, request));
    }

    @DeleteMapping("/stations/{id}")
    public ApiResponse<Void> deleteStation(Authentication authentication, @PathVariable Long id) {
        adminManagementService.deleteStation(authentication, id);
        return ApiResponse.success(null);
    }

    @GetMapping("/monitor-data")
    public ApiResponse<List<MonitorDataItem>> monitorData(Authentication authentication) {
        return ApiResponse.success(adminManagementService.listMonitorData(authentication));
    }

    @PostMapping("/monitor-data")
    public ApiResponse<MonitorDataItem> createMonitorData(Authentication authentication,
                                                          @Valid @RequestBody MonitorDataRequest request) {
        return ApiResponse.success(adminManagementService.createMonitorData(authentication, request));
    }

    @PutMapping("/monitor-data/{id}")
    public ApiResponse<MonitorDataItem> updateMonitorData(Authentication authentication, @PathVariable Long id,
                                                          @Valid @RequestBody MonitorDataRequest request) {
        return ApiResponse.success(adminManagementService.updateMonitorData(authentication, id, request));
    }

    @DeleteMapping("/monitor-data/{id}")
    public ApiResponse<Void> deleteMonitorData(Authentication authentication, @PathVariable Long id) {
        adminManagementService.deleteMonitorData(authentication, id);
        return ApiResponse.success(null);
    }

    @GetMapping("/monitor-data/params")
    public ApiResponse<List<MonitorDataRangeRequest>> monitorDataParams(Authentication authentication) {
        return ApiResponse.success(adminManagementService.listMonitorParamTemplates(authentication));
    }

    @PostMapping("/monitor-data/simulate")
    public ApiResponse<List<MonitorDataItem>> simulateMonitorData(Authentication authentication,
                                                                  @Valid @RequestBody MonitorDataSimulateRequest request) {
        return ApiResponse.success(adminManagementService.simulateMonitorData(authentication, request));
    }
}
