package com.himma.envagent.module.admin.service;

import com.himma.envagent.common.exception.BusinessException;
import com.himma.envagent.module.admin.domain.AdminRecords.DefaultMenu;
import com.himma.envagent.module.admin.entity.AdminKnowledgeBaseEntity;
import com.himma.envagent.module.admin.entity.AiModelEntity;
import com.himma.envagent.module.admin.entity.ModelVendorEntity;
import com.himma.envagent.module.admin.entity.SysDictItemEntity;
import com.himma.envagent.module.admin.entity.SysMenuEntity;
import com.himma.envagent.module.admin.entity.SysRoleEntity;
import com.himma.envagent.module.admin.repository.AdminRepository;
import com.himma.envagent.module.admin.vo.AdminPayloads.DictItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.DictRequest;
import com.himma.envagent.module.admin.vo.AdminPayloads.KnowledgeBaseItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.KnowledgeBaseRequest;
import com.himma.envagent.module.admin.vo.AdminPayloads.MenuItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.MenuRequest;
import com.himma.envagent.module.admin.vo.AdminPayloads.MenuTreeItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.ModelItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.ModelRequest;
import com.himma.envagent.module.admin.vo.AdminPayloads.RoleItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.RoleRequest;
import com.himma.envagent.module.admin.vo.AdminPayloads.UserItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.UserRequest;
import com.himma.envagent.module.admin.vo.AdminPayloads.VendorItem;
import com.himma.envagent.module.admin.vo.AdminPayloads.VendorRequest;
import com.himma.envagent.module.auth.domain.UserEntity;
import com.himma.envagent.module.auth.domain.UserRole;
import com.himma.envagent.module.auth.domain.UserStatus;
import com.himma.envagent.module.workspace.service.WorkspaceAccessService;
import jakarta.annotation.PostConstruct;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminManagementService {

    private static final List<DefaultMenu> DEFAULT_MENUS = List.of(
            new DefaultMenu("dash", null, "Dashboard", "监管总览", "/dashboard", "DashboardView", "LayoutDashboard", null, 10),
            new DefaultMenu("chat", null, "Chat", "智能问答", "/chat", "ChatView", "MessageCircle", null, 20),
            new DefaultMenu("source", null, "Source", "污染源", "/source", "SourceView", "Factory", null, 30),
            new DefaultMenu("kb", null, "Knowledge", "知识库", "/knowledge", "KnowledgeView", "Library", null, 40),
            new DefaultMenu("agent", null, "Agent", "Agent", "/agent", "AgentView", "Bot", null, 50),
            new DefaultMenu("monitor", null, "Monitor", "系统监控", "/monitor", "MonitorView", "Activity", null, 60),
            new DefaultMenu("admin", null, "Admin", "基础管理", "/admin", null, "Settings", "/admin/users", 70),
            new DefaultMenu("users", "admin", "Users", "用户管理", "/admin/users", "UsersView", "Users", null, 10),
            new DefaultMenu("roles", "admin", "Roles", "角色管理", "/admin/roles", "AdminView", "ShieldCheck", null, 20),
            new DefaultMenu("menus", "admin", "Menus", "菜单管理", "/admin/menus", "AdminView", "Layers", null, 30),
            new DefaultMenu("knowledge-bases", "admin", "Knowledge Bases", "知识库管理", "/admin/knowledge-bases", "AdminView", "Database", null, 40),
            new DefaultMenu("vendors", "admin", "Vendors", "厂商管理", "/admin/vendors", "AdminView", "Settings", null, 50),
            new DefaultMenu("models", "admin", "Models", "模型管理", "/admin/models", "AdminView", "Settings2", null, 60),
            new DefaultMenu("dictionaries", "admin", "Dictionaries", "业务字典", "/admin/dictionaries", "AdminView", "BookText", null, 70)
    );

    private final AdminRepository adminRepository;
    private final WorkspaceAccessService workspaceAccessService;
    private final PasswordEncoder passwordEncoder;

    public AdminManagementService(AdminRepository adminRepository, WorkspaceAccessService workspaceAccessService,
                                  PasswordEncoder passwordEncoder) {
        this.adminRepository = adminRepository;
        this.workspaceAccessService = workspaceAccessService;
        this.passwordEncoder = passwordEncoder;
    }

    @PostConstruct
    @Transactional
    public void ensureDefaults() {
        ensureRole("INSPECTOR", "执法人员", "现场执法与日常问答", 10);
        ensureRole("ANALYST", "监测分析员", "知识库、Agent 与分析工作台", 20);
        ensureRole("ADMIN", "管理层", "系统管理与全量数据访问", 30);
        for (DefaultMenu menu : DEFAULT_MENUS) {
            ensureMenu(menu);
        }
        ensureRoleMenus("ADMIN", List.of("dash", "chat", "source", "kb", "agent", "monitor", "admin", "users", "roles", "menus",
                "knowledge-bases", "vendors", "models", "dictionaries"));
        ensureDictItem("COMMON_STATUS", "启用", "ACTIVE", "通用启用状态", 10);
        ensureDictItem("COMMON_STATUS", "停用", "DISABLED", "通用停用状态", 20);
        ensureDictItem("MODEL_TYPE", "对话模型", "CHAT", "面向聊天与推理问答", 10);
        ensureDictItem("MODEL_TYPE", "向量模型", "EMBEDDING", "面向文本向量化与检索", 20);
        ensureRoleMenus("ANALYST", List.of("dash", "chat", "source", "kb", "agent"));
        ensureRoleMenus("INSPECTOR", List.of("dash", "chat", "source"));
        ensureVendorAndModel();
    }

    public List<RoleItem> listRoles(Authentication authentication) {
        requireAdmin(authentication);
        return adminRepository.roles().stream().map(this::toRoleItem).toList();
    }

    @Transactional
    public RoleItem createRole(Authentication authentication, RoleRequest request) {
        requireAdmin(authentication);
        return toRoleItem(adminRepository.saveRole(applyRole(new SysRoleEntity(), request)));
    }

    @Transactional
    public RoleItem updateRole(Authentication authentication, Long id, RoleRequest request) {
        requireAdmin(authentication);
        SysRoleEntity entity = adminRepository.roleById(id).orElseThrow(() -> new BusinessException(404, "角色不存在"));
        return toRoleItem(adminRepository.saveRole(applyRole(entity, request)));
    }

    @Transactional
    public void deleteRole(Authentication authentication, Long id) {
        requireAdmin(authentication);
        adminRepository.deleteRole(id);
    }

    public List<MenuTreeItem> listMenus(Authentication authentication) {
        requireAdmin(authentication);
        return buildTree(adminRepository.menus());
    }

    @Transactional
    public MenuItem createMenu(Authentication authentication, MenuRequest request) {
        requireAdmin(authentication);
        return toMenuItem(adminRepository.saveMenu(applyMenu(new SysMenuEntity(), request)));
    }

    @Transactional
    public MenuItem updateMenu(Authentication authentication, Long id, MenuRequest request) {
        requireAdmin(authentication);
        SysMenuEntity entity = adminRepository.menuById(id).orElseThrow(() -> new BusinessException(404, "菜单不存在"));
        return toMenuItem(adminRepository.saveMenu(applyMenu(entity, request)));
    }

    @Transactional
    public void deleteMenu(Authentication authentication, Long id) {
        requireAdmin(authentication);
        adminRepository.deleteMenu(id);
    }

    @Transactional
    public void replaceRoleMenus(Authentication authentication, Long id, List<Long> menuIds) {
        requireAdmin(authentication);
        adminRepository.replaceRoleMenus(id, menuIds);
    }

    public List<UserItem> listUsers(Authentication authentication) {
        requireAdmin(authentication);
        return adminRepository.users().stream().map(this::toUserItem).toList();
    }

    public List<DictItem> listDictItems(Authentication authentication) {
        requireAdmin(authentication);
        return adminRepository.dictItems().stream().map(this::toDictItem).toList();
    }

    @Transactional
    public DictItem createDictItem(Authentication authentication, DictRequest request) {
        requireAdmin(authentication);
        adminRepository.dictItemByTypeAndValue(request.dictType().trim(), request.dictValue().trim())
                .ifPresent((item) -> {
                    throw new BusinessException(409, "同一字典类型下的字典值已存在");
                });
        return toDictItem(adminRepository.saveDictItem(applyDictItem(new SysDictItemEntity(), request)));
    }

    @Transactional
    public DictItem updateDictItem(Authentication authentication, Long id, DictRequest request) {
        requireAdmin(authentication);
        SysDictItemEntity entity = adminRepository.dictItemById(id).orElseThrow(() -> new BusinessException(404, "字典项不存在"));
        adminRepository.dictItemByTypeAndValue(request.dictType().trim(), request.dictValue().trim())
                .filter((item) -> !item.getId().equals(id))
                .ifPresent((item) -> {
                    throw new BusinessException(409, "同一字典类型下的字典值已存在");
                });
        return toDictItem(adminRepository.saveDictItem(applyDictItem(entity, request)));
    }

    @Transactional
    public void deleteDictItem(Authentication authentication, Long id) {
        requireAdmin(authentication);
        adminRepository.deleteDictItem(id);
    }

    @Transactional
    public UserItem createUser(Authentication authentication, UserRequest request) {
        requireAdmin(authentication);
        adminRepository.userByUsername(request.username()).ifPresent((user) -> {
            throw new BusinessException(409, "用户名已存在");
        });
        return toUserItem(adminRepository.saveUser(applyUser(new UserEntity(), request, true)));
    }

    @Transactional
    public UserItem updateUser(Authentication authentication, Long id, UserRequest request) {
        requireAdmin(authentication);
        UserEntity entity = adminRepository.userById(id).orElseThrow(() -> new BusinessException(404, "用户不存在"));
        adminRepository.userByUsername(request.username())
                .filter((user) -> !user.getId().equals(id))
                .ifPresent((user) -> {
                    throw new BusinessException(409, "用户名已存在");
                });
        return toUserItem(adminRepository.saveUser(applyUser(entity, request, false)));
    }

    @Transactional
    public void deleteUser(Authentication authentication, Long id) {
        requireAdmin(authentication);
        adminRepository.deleteUser(id);
    }

    public List<MenuTreeItem> navigation(Authentication authentication) {
        return buildTree(adminRepository.visibleMenusByRole(currentRole(authentication)));
    }

    public List<VendorItem> listVendors(Authentication authentication) {
        requireAdmin(authentication);
        return adminRepository.vendors().stream().map(this::toVendorItem).toList();
    }

    @Transactional
    public VendorItem createVendor(Authentication authentication, VendorRequest request) {
        requireAdmin(authentication);
        return toVendorItem(adminRepository.saveVendor(applyVendor(new ModelVendorEntity(), request)));
    }

    @Transactional
    public VendorItem updateVendor(Authentication authentication, Long id, VendorRequest request) {
        requireAdmin(authentication);
        ModelVendorEntity entity = adminRepository.vendorById(id)
                .orElseThrow(() -> new BusinessException(404, "厂商不存在"));
        return toVendorItem(adminRepository.saveVendor(applyVendor(entity, request)));
    }

    @Transactional
    public void deleteVendor(Authentication authentication, Long id) {
        requireAdmin(authentication);
        adminRepository.deleteVendor(id);
    }

    public List<ModelItem> listModels(Authentication authentication) {
        requireAdmin(authentication);
        return adminRepository.models().stream().map(this::toModelItem).toList();
    }

    @Transactional
    public ModelItem createModel(Authentication authentication, ModelRequest request) {
        requireAdmin(authentication);
        return toModelItem(adminRepository.saveModel(applyModel(new AiModelEntity(), request)));
    }

    @Transactional
    public ModelItem updateModel(Authentication authentication, Long id, ModelRequest request) {
        requireAdmin(authentication);
        AiModelEntity entity = adminRepository.modelById(id)
                .orElseThrow(() -> new BusinessException(404, "模型不存在"));
        return toModelItem(adminRepository.saveModel(applyModel(entity, request)));
    }

    @Transactional
    public void deleteModel(Authentication authentication, Long id) {
        requireAdmin(authentication);
        adminRepository.deleteModel(id);
    }

    public List<KnowledgeBaseItem> listKnowledgeBases(Authentication authentication) {
        requireAdmin(authentication);
        return adminRepository.knowledgeBases().stream().map(this::toKnowledgeBaseItem).toList();
    }

    @Transactional
    public KnowledgeBaseItem createKnowledgeBase(Authentication authentication, KnowledgeBaseRequest request) {
        requireAdmin(authentication);
        return toKnowledgeBaseItem(adminRepository.saveKnowledgeBase(applyKnowledgeBase(new AdminKnowledgeBaseEntity(), request)));
    }

    @Transactional
    public KnowledgeBaseItem updateKnowledgeBase(Authentication authentication, Long id, KnowledgeBaseRequest request) {
        requireAdmin(authentication);
        AdminKnowledgeBaseEntity entity = new AdminKnowledgeBaseEntity();
        entity.setId(id);
        return toKnowledgeBaseItem(adminRepository.saveKnowledgeBase(applyKnowledgeBase(entity, request)));
    }

    @Transactional
    public void deleteKnowledgeBase(Authentication authentication, Long id) {
        requireAdmin(authentication);
        adminRepository.deleteKnowledgeBase(id);
    }

    private void requireAdmin(Authentication authentication) {
        workspaceAccessService.requireRoles(authentication, "基础管理接口", UserRole.ADMIN);
    }

    private String currentRole(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .filter(authority -> authority.startsWith("ROLE_"))
                .map(authority -> authority.substring(5))
                .findFirst()
                .orElseThrow(() -> new BusinessException(403, "当前用户未分配角色"));
    }

    private void ensureRole(String code, String name, String description, int sortOrder) {
        adminRepository.roleByCode(code).orElseGet(() -> {
            SysRoleEntity entity = new SysRoleEntity();
            entity.setCode(code);
            entity.setName(name);
            entity.setDescription(description);
            entity.setSortOrder(sortOrder);
            entity.setEnabled(true);
            return adminRepository.saveRole(entity);
        });
    }

    private void ensureMenu(DefaultMenu menu) {
        SysMenuEntity entity = adminRepository.menuByCode(menu.code()).orElseGet(SysMenuEntity::new);
        Long parentId = menu.parentCode() == null
                ? null
                : adminRepository.menuByCode(menu.parentCode()).map(SysMenuEntity::getId).orElse(null);
        entity.setParentId(parentId);
        entity.setCode(menu.code());
        entity.setName(menu.name());
        entity.setTitle(menu.title());
        entity.setPath(menu.path());
        entity.setComponent(menu.component());
        entity.setIcon(menu.icon());
        entity.setRedirect(menu.redirect());
        entity.setSortOrder(menu.sortOrder());
        entity.setVisible(true);
        adminRepository.saveMenu(entity);
    }

    private void ensureRoleMenus(String roleCode, List<String> menuCodes) {
        Long roleId = adminRepository.roleByCode(roleCode).orElseThrow().getId();
        for (String menuCode : menuCodes) {
            Long menuId = adminRepository.menuByCode(menuCode).orElseThrow().getId();
            adminRepository.addRoleMenuIfMissing(roleId, menuId);
        }
    }

    private void ensureDictItem(String dictType, String dictLabel, String dictValue, String description, int sortOrder) {
        SysDictItemEntity entity = adminRepository.dictItemByTypeAndValue(dictType, dictValue).orElseGet(SysDictItemEntity::new);
        entity.setDictType(dictType);
        entity.setDictLabel(dictLabel);
        entity.setDictValue(dictValue);
        entity.setDescription(description);
        entity.setEnabled(true);
        entity.setSortOrder(sortOrder);
        entity.setUpdatedAt(LocalDateTime.now());
        adminRepository.saveDictItem(entity);
    }

    private void ensureVendorAndModel() {
        ModelVendorEntity vendor = adminRepository.vendorByCode("openai").orElseGet(() -> {
            ModelVendorEntity entity = new ModelVendorEntity();
            entity.setCode("openai");
            entity.setName("OpenAI Compatible");
            entity.setBaseUrl("http://127.0.0.1:11434/v1");
            entity.setDescription("OpenAI compatible chat and embedding endpoint");
            entity.setEnabled(true);
            entity.setSortOrder(10);
            return adminRepository.saveVendor(entity);
        });
        boolean hasDefaultChatModel = adminRepository.models().stream()
                .anyMatch(model -> "gpt-4o-mini".equals(model.getCode()));
        if (!hasDefaultChatModel) {
            AiModelEntity entity = new AiModelEntity();
            entity.setVendorId(vendor.getId());
            entity.setCode("gpt-4o-mini");
            entity.setName("GPT-4o mini");
            entity.setModelType("CHAT");
            entity.setContextWindow(128000);
            entity.setMaxOutputTokens(16384);
            entity.setEnabled(true);
            entity.setSortOrder(10);
            adminRepository.saveModel(entity);
        }
    }

    private SysRoleEntity applyRole(SysRoleEntity entity, RoleRequest request) {
        entity.setCode(request.code());
        entity.setName(request.name());
        entity.setDescription(request.description());
        entity.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
        entity.setEnabled(request.enabled() == null || request.enabled());
        entity.setUpdatedAt(LocalDateTime.now());
        return entity;
    }

    private SysMenuEntity applyMenu(SysMenuEntity entity, MenuRequest request) {
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

    private UserEntity applyUser(UserEntity entity, UserRequest request, boolean createMode) {
        entity.setUsername(request.username());
        entity.setRole(request.roleCode());
        entity.setDept(request.dept());
        entity.setStatus((request.status() == null || request.status().isBlank()) ? UserStatus.ACTIVE.name() : request.status());
        if (createMode) {
            String rawPassword = (request.password() == null || request.password().isBlank()) ? "Env@123456" : request.password();
            entity.setPasswordHash(passwordEncoder.encode(rawPassword));
            entity.setCreatedAt(LocalDateTime.now());
        } else if (request.password() != null && !request.password().isBlank()) {
            entity.setPasswordHash(passwordEncoder.encode(request.password()));
        }
        entity.setUpdatedAt(LocalDateTime.now());
        return entity;
    }

    private SysDictItemEntity applyDictItem(SysDictItemEntity entity, DictRequest request) {
        entity.setDictType(request.dictType().trim());
        entity.setDictLabel(request.dictLabel().trim());
        entity.setDictValue(request.dictValue().trim());
        entity.setDescription(request.description());
        entity.setEnabled(request.enabled() == null || request.enabled());
        entity.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
        entity.setUpdatedAt(LocalDateTime.now());
        return entity;
    }

    private ModelVendorEntity applyVendor(ModelVendorEntity entity, VendorRequest request) {
        entity.setCode(request.code());
        entity.setName(request.name());
        entity.setBaseUrl(request.baseUrl());
        if (request.apiKey() != null && !request.apiKey().isBlank()) {
            String normalizedApiKey = request.apiKey().trim();
            entity.setApiKey(normalizedApiKey);
            entity.setApiKeyMasked(maskApiKey(normalizedApiKey));
        }
        entity.setDescription(request.description());
        entity.setEnabled(request.enabled() == null || request.enabled());
        entity.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
        entity.setUpdatedAt(LocalDateTime.now());
        return entity;
    }

    private AiModelEntity applyModel(AiModelEntity entity, ModelRequest request) {
        entity.setVendorId(request.vendorId());
        entity.setCode(request.code());
        entity.setName(request.name());
        entity.setModelType(request.modelType() == null ? "CHAT" : request.modelType());
        entity.setContextWindow(request.contextWindow());
        entity.setMaxOutputTokens(request.maxOutputTokens());
        entity.setEnabled(request.enabled() == null || request.enabled());
        entity.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
        entity.setUpdatedAt(LocalDateTime.now());
        return entity;
    }

    private AdminKnowledgeBaseEntity applyKnowledgeBase(AdminKnowledgeBaseEntity entity, KnowledgeBaseRequest request) {
        entity.setCode(request.code());
        entity.setName(request.name());
        entity.setDescription(request.description());
        entity.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
        entity.setCreatedBy(request.createdBy());
        entity.setUpdatedAt(LocalDateTime.now());
        return entity;
    }

    private List<MenuTreeItem> buildTree(List<SysMenuEntity> menus) {
        Map<Long, List<SysMenuEntity>> byParent = new LinkedHashMap<>();
        for (SysMenuEntity menu : menus) {
            byParent.computeIfAbsent(menu.getParentId() == null ? 0L : menu.getParentId(), ignored -> new ArrayList<>()).add(menu);
        }
        return toTree(byParent, 0L);
    }

    private List<MenuTreeItem> toTree(Map<Long, List<SysMenuEntity>> byParent, Long parentId) {
        return byParent.getOrDefault(parentId, List.of()).stream()
                .map(menu -> {
                    List<MenuTreeItem> children = toTree(byParent, menu.getId());
                    return new MenuTreeItem(menu.getId(), menu.getParentId(), menu.getCode(), menu.getName(), menu.getTitle(),
                            menu.getPath(), menu.getComponent(), menu.getIcon(), menu.getRedirect(), menu.getSortOrder(),
                            menu.getVisible(), children);
                })
                .toList();
    }

    private RoleItem toRoleItem(SysRoleEntity entity) {
        return new RoleItem(entity.getId(), entity.getCode(), entity.getName(), entity.getDescription(),
                entity.getSortOrder(), entity.getEnabled(), adminRepository.menuIdsByRoleId(entity.getId()),
                entity.getCreatedAt(), entity.getUpdatedAt());
    }

    private UserItem toUserItem(UserEntity entity) {
        String roleName = adminRepository.roleByCode(entity.getRole())
                .map(SysRoleEntity::getName)
                .orElse(entity.getRole());
        return new UserItem(entity.getId(), entity.getUsername(), entity.getRole(), roleName, entity.getDept(),
                entity.getStatus(), entity.getLastLoginAt(), entity.getCreatedAt(), entity.getUpdatedAt());
    }

    private MenuItem toMenuItem(SysMenuEntity entity) {
        return new MenuItem(entity.getId(), entity.getParentId(), entity.getCode(), entity.getName(), entity.getTitle(),
                entity.getPath(), entity.getComponent(), entity.getIcon(), entity.getRedirect(), entity.getSortOrder(),
                entity.getVisible(), entity.getCreatedAt(), entity.getUpdatedAt());
    }

    private VendorItem toVendorItem(ModelVendorEntity entity) {
        return new VendorItem(entity.getId(), entity.getCode(), entity.getName(), entity.getBaseUrl(),
                entity.getApiKeyMasked(), entity.getDescription(), entity.getEnabled(), entity.getSortOrder(),
                entity.getCreatedAt(), entity.getUpdatedAt());
    }

    private DictItem toDictItem(SysDictItemEntity entity) {
        return new DictItem(entity.getId(), entity.getDictType(), entity.getDictLabel(), entity.getDictValue(),
                entity.getDescription(), entity.getEnabled(), entity.getSortOrder(), entity.getCreatedAt(), entity.getUpdatedAt());
    }

    private String maskApiKey(String apiKey) {
        String normalized = apiKey == null ? "" : apiKey.trim();
        if (normalized.isEmpty()) {
            return null;
        }
        if (normalized.length() <= 8) {
            return normalized.charAt(0) + "***" + normalized.charAt(normalized.length() - 1);
        }
        return normalized.substring(0, 3) + "****" + normalized.substring(normalized.length() - 4);
    }

    private ModelItem toModelItem(AiModelEntity entity) {
        String vendorName = adminRepository.vendorById(entity.getVendorId()).map(ModelVendorEntity::getName).orElse("");
        return new ModelItem(entity.getId(), entity.getVendorId(), vendorName, entity.getCode(), entity.getName(),
                entity.getModelType(), entity.getContextWindow(), entity.getMaxOutputTokens(), entity.getEnabled(),
                entity.getSortOrder(), entity.getCreatedAt(), entity.getUpdatedAt());
    }

    private KnowledgeBaseItem toKnowledgeBaseItem(AdminKnowledgeBaseEntity entity) {
        return new KnowledgeBaseItem(entity.getId(), entity.getCode(), entity.getName(), entity.getDescription(),
                entity.getSortOrder(), entity.getCreatedBy(), entity.getCreatedAt(), entity.getUpdatedAt());
    }
}
