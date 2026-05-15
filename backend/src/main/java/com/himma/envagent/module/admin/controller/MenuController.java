package com.himma.envagent.module.admin.controller;

import com.himma.envagent.common.api.ApiResponse;
import com.himma.envagent.module.admin.service.MenuService;
import com.himma.envagent.module.admin.vo.AdminPayloads.MenuItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.MenuRequest;
import com.himma.envagent.module.admin.vo.AdminPayloads.MenuTreeItem;
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
public class MenuController {

    private final MenuService menuService;

    public MenuController(MenuService menuService) {
        this.menuService = menuService;
    }

    @GetMapping("/menus")
    public ApiResponse<List<MenuTreeItem>> list(Authentication authentication) {
        return ApiResponse.success(menuService.list(authentication));
    }

    @GetMapping({"/navigation", "/menus/navigation"})
    public ApiResponse<List<MenuTreeItem>> navigation(Authentication authentication) {
        return ApiResponse.success(menuService.navigation(authentication));
    }

    @PostMapping("/menus")
    public ApiResponse<MenuItem> create(Authentication authentication, @Valid @RequestBody MenuRequest request) {
        return ApiResponse.success(menuService.create(authentication, request));
    }

    @PutMapping("/menus/{id}")
    public ApiResponse<MenuItem> update(Authentication authentication, @PathVariable Long id,
                                        @Valid @RequestBody MenuRequest request) {
        return ApiResponse.success(menuService.update(authentication, id, request));
    }

    @DeleteMapping("/menus/{id}")
    public ApiResponse<Void> delete(Authentication authentication, @PathVariable Long id) {
        menuService.delete(authentication, id);
        return ApiResponse.success(null);
    }
}
