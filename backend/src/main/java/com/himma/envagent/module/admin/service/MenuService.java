package com.himma.envagent.module.admin.service;

import com.himma.envagent.common.exception.BusinessException;
import com.himma.envagent.module.admin.entity.SysMenuEntity;
import com.himma.envagent.module.admin.repository.AdminRepository;
import com.himma.envagent.module.admin.service.support.AdminAccessSupport;
import com.himma.envagent.module.admin.vo.AdminPayloads.MenuItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.MenuRequest;
import com.himma.envagent.module.admin.vo.AdminPayloads.MenuTreeItem;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MenuService {

    private static final String RESOURCE = "菜单管理";

    private final AdminRepository adminRepository;
    private final AdminAccessSupport access;

    public MenuService(AdminRepository adminRepository, AdminAccessSupport access) {
        this.adminRepository = adminRepository;
        this.access = access;
    }

    public List<MenuTreeItem> list(Authentication authentication) {
        access.requireAdmin(authentication, RESOURCE);
        return buildTree(adminRepository.menus());
    }

    public List<MenuTreeItem> navigation(Authentication authentication) {
        return buildTree(adminRepository.visibleMenusByRole(access.currentRole(authentication)));
    }

    @Transactional
    public MenuItem create(Authentication authentication, MenuRequest request) {
        access.requireAdmin(authentication, RESOURCE);
        return toItem(adminRepository.saveMenu(apply(new SysMenuEntity(), request)));
    }

    @Transactional
    public MenuItem update(Authentication authentication, Long id, MenuRequest request) {
        access.requireAdmin(authentication, RESOURCE);
        SysMenuEntity entity = adminRepository.menuById(id).orElseThrow(() -> new BusinessException(404, "菜单不存在"));
        return toItem(adminRepository.saveMenu(apply(entity, request)));
    }

    @Transactional
    public void delete(Authentication authentication, Long id) {
        access.requireAdmin(authentication, RESOURCE);
        adminRepository.deleteMenu(id);
    }

    private static SysMenuEntity apply(SysMenuEntity entity, MenuRequest request) {
        entity.setParentId(request.parentId());
        entity.setCode(request.code());
        entity.setName(request.name());
        entity.setTitle(request.title());
        entity.setPath(request.path());
        entity.setComponent(request.component());
        entity.setIcon(request.icon());
        entity.setRedirect(request.redirect());
        entity.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
        entity.setVisible(request.visible() == null || request.visible());
        entity.setUpdatedAt(LocalDateTime.now());
        return entity;
    }

    private static MenuItem toItem(SysMenuEntity entity) {
        return new MenuItem(entity.getId(), entity.getParentId(), entity.getCode(), entity.getName(), entity.getTitle(),
                entity.getPath(), entity.getComponent(), entity.getIcon(), entity.getRedirect(), entity.getSortOrder(),
                entity.getVisible(), entity.getCreatedAt(), entity.getUpdatedAt());
    }

    private static List<MenuTreeItem> buildTree(List<SysMenuEntity> menus) {
        Map<Long, List<SysMenuEntity>> byParent = new LinkedHashMap<>();
        for (SysMenuEntity menu : menus) {
            byParent.computeIfAbsent(menu.getParentId() == null ? 0L : menu.getParentId(), ignored -> new ArrayList<>()).add(menu);
        }
        return toTree(byParent, 0L);
    }

    private static List<MenuTreeItem> toTree(Map<Long, List<SysMenuEntity>> byParent, Long parentId) {
        return byParent.getOrDefault(parentId, List.of()).stream()
                .map(menu -> {
                    List<MenuTreeItem> children = toTree(byParent, menu.getId());
                    return new MenuTreeItem(menu.getId(), menu.getParentId(), menu.getCode(), menu.getName(), menu.getTitle(),
                            menu.getPath(), menu.getComponent(), menu.getIcon(), menu.getRedirect(), menu.getSortOrder(),
                            menu.getVisible(), children);
                })
                .toList();
    }
}
