package com.himma.envagent.module.agent.tool.service;

import com.himma.envagent.module.admin.entity.SysRoleEntity;
import com.himma.envagent.module.admin.repository.AdminRepository;
import com.himma.envagent.module.agent.tool.entity.AgentToolEntity;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * 初始化默认工具种子数据（首次启动时插入若干内置工具定义并绑定角色）。
 * 由 AdminManagementService.ensureDefaults() 在系统启动时调用一次。
 */
@Component
public class AgentToolBootstrap {

    private final AgentToolService agentToolService;
    private final AdminRepository adminRepository;

    public AgentToolBootstrap(AgentToolService agentToolService, AdminRepository adminRepository) {
        this.agentToolService = agentToolService;
        this.adminRepository = adminRepository;
    }

    public void ensureDefaultTools() {
        seed("weather_lookup", "查询指定地区的实时天气、未来24小时天气和空气质量信息。", """
                {
                  "type": "object",
                  "properties": {
                    "location": { "type": "string", "description": "地区名称，例如无锡" },
                    "date": { "type": "string", "description": "日期，可传 today" }
                  },
                  "required": ["location"]
                }
                """, "environment", List.of("天气", "气象", "出行"), "1.0.0", List.of("ADMIN", "ANALYST"));

        seed("station_overview", "根据站点编码或 MN 查询站点名称、坐标、站点类型和运行状态。", """
                {
                  "type": "object",
                  "properties": {
                    "mn": { "type": "string" },
                    "stationId": { "type": "string" }
                  }
                }
                """, "monitoring", List.of("站点", "监测点", "太湖"), "1.0.0", List.of("ADMIN", "ANALYST"));

        seed("mail_sender", "向指定收件人发送告警通知、日报或问答结果摘要邮件。", """
                {
                  "type": "object",
                  "properties": {
                    "to": { "type": "array", "items": { "type": "string" } },
                    "subject": { "type": "string" },
                    "content": { "type": "string" }
                  },
                  "required": ["to", "subject", "content"]
                }
                """, "office", List.of("邮件", "通知", "发送"), "1.0.0", List.of("ADMIN"));
    }

    private void seed(String name, String description, String parametersSchema,
                      String groupName, List<String> tags, String version, List<String> roleCodes) {
        AgentToolEntity saved = agentToolService.ensureSeedTool(name, description, parametersSchema,
                groupName, tags, version);
        for (String roleCode : roleCodes) {
            adminRepository.roleByCode(roleCode)
                    .map(SysRoleEntity::getId)
                    .ifPresent(roleId -> agentToolService.ensureSeedRole(saved.getId(), roleId));
        }
    }
}
