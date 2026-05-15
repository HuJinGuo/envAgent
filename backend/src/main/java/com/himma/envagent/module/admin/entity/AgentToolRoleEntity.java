package com.himma.envagent.module.admin.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

@TableName("agent_tool_roles")
public class AgentToolRoleEntity {

    @TableId(type = IdType.INPUT)
    private Long id;
    private Long toolId;
    private Long roleId;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getToolId() { return toolId; }
    public void setToolId(Long toolId) { this.toolId = toolId; }
    public Long getRoleId() { return roleId; }
    public void setRoleId(Long roleId) { this.roleId = roleId; }
}
