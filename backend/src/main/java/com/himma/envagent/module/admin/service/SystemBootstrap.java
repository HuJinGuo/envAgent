package com.himma.envagent.module.admin.service;

import com.himma.envagent.module.admin.domain.AdminRecords.DefaultMenu;
import com.himma.envagent.module.admin.entity.AiModelEntity;
import com.himma.envagent.module.admin.entity.ModelVendorEntity;
import com.himma.envagent.module.admin.entity.SysDictItemEntity;
import com.himma.envagent.module.admin.entity.SysMenuEntity;
import com.himma.envagent.module.admin.entity.SysRoleEntity;
import com.himma.envagent.module.admin.repository.AdminRepository;
import com.himma.envagent.module.agent.tool.service.AgentToolBootstrap;
import com.himma.envagent.module.business.monitor.service.MonitorSimulationService;
import com.himma.envagent.module.business.monitor.service.MonitorStationService;
import jakarta.annotation.PostConstruct;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 系统初始化入口：在 Spring 容器就绪后，确保最小可用的角色、菜单、字典、厂商、模型种子数据落库，
 * 并把 Agent 工具 / 业务监测的种子初始化委托给各自模块的 Bootstrap。
 */
@Component
public class SystemBootstrap {

    private static final List<DefaultMenu> DEFAULT_MENUS = List.of(
            new DefaultMenu("dash", null, "Dashboard", "监管总览", "/dashboard", "DashboardView", "LayoutDashboard", null, 10),
            new DefaultMenu("chat", null, "Chat", "智能问答", "/chat", "ChatView", "MessageCircle", null, 20),
            new DefaultMenu("source", null, "Source", "污染源", "/source", "SourceView", "Factory", null, 30),
            new DefaultMenu("kb", null, "Knowledge", "知识库", "/knowledge", "KnowledgeView", "Library", null, 40),
            new DefaultMenu("agent", null, "Agent", "Agent", "/agent", "AgentView", "Bot", null, 50),
            new DefaultMenu("monitor", null, "Monitor", "系统监控", "/monitor", "MonitorView", "Activity", null, 60),
            new DefaultMenu("admin", null, "Admin", "基础管理", "/admin", null, "Settings", "/admin/users", 70),
            new DefaultMenu("business", null, "Business", "业务管理", "/business", null, "BriefcaseBusiness", "/business/stations", 80),
            new DefaultMenu("users", "admin", "Users", "用户管理", "/admin/users", "UsersView", "Users", null, 10),
            new DefaultMenu("roles", "admin", "Roles", "角色管理", "/admin/roles", "AdminView", "ShieldCheck", null, 20),
            new DefaultMenu("menus", "admin", "Menus", "菜单管理", "/admin/menus", "AdminView", "Layers", null, 30),
            new DefaultMenu("knowledge-bases", "admin", "Knowledge Bases", "知识库管理", "/admin/knowledge-bases", "AdminView", "Database", null, 40),
            new DefaultMenu("vendors", "admin", "Vendors", "厂商管理", "/admin/vendors", "AdminView", "Settings", null, 50),
            new DefaultMenu("models", "admin", "Models", "模型管理", "/admin/models", "AdminView", "Settings2", null, 60),
            new DefaultMenu("dictionaries", "admin", "Dictionaries", "业务字典", "/admin/dictionaries", "AdminView", "BookText", null, 70),
            new DefaultMenu("tools", "admin", "Tools", "工具管理", "/admin/tools", "AdminView", "Wrench", null, 80),
            new DefaultMenu("stations", "business", "Stations", "站点管理", "/business/stations", "AdminView", "MapPinned", null, 10),
            new DefaultMenu("monitor-data", "business", "Monitor Data", "监测数据", "/business/monitor-data", "AdminView", "ChartColumnBig", null, 20)
    );

    private final AdminRepository adminRepository;
    private final AgentToolBootstrap agentToolBootstrap;
    private final MonitorStationService monitorStationService;
    private final MonitorSimulationService monitorSimulationService;

    public SystemBootstrap(AdminRepository adminRepository,
                           AgentToolBootstrap agentToolBootstrap,
                           MonitorStationService monitorStationService,
                           MonitorSimulationService monitorSimulationService) {
        this.adminRepository = adminRepository;
        this.agentToolBootstrap = agentToolBootstrap;
        this.monitorStationService = monitorStationService;
        this.monitorSimulationService = monitorSimulationService;
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
                "knowledge-bases", "vendors", "models", "dictionaries", "tools", "business", "stations", "monitor-data"));
        ensureDictItem("COMMON_STATUS", "启用", "ACTIVE", "通用启用状态", 10);
        ensureDictItem("COMMON_STATUS", "停用", "DISABLED", "通用停用状态", 20);
        ensureDictItem("MODEL_TYPE", "对话模型", "CHAT", "面向聊天与推理问答", 10);
        ensureDictItem("MODEL_TYPE", "向量模型", "EMBEDDING", "面向文本向量化与检索", 20);
        ensureRoleMenus("ANALYST", List.of("dash", "chat", "source", "kb", "agent"));
        ensureRoleMenus("INSPECTOR", List.of("dash", "chat", "source"));
        ensureVendorAndModel();
        agentToolBootstrap.ensureDefaultTools();
        monitorStationService.ensureDefaultStations();
        monitorSimulationService.seedSampleDataIfEmpty();
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
}
