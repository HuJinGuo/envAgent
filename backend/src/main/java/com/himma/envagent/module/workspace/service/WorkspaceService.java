package com.himma.envagent.module.workspace.service;

import com.himma.envagent.module.workspace.vo.WorkspacePayloads.AgentWorkspace;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.ChatWorkspace;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.DashboardSnapshot;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.KnowledgeWorkspace;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.MonitorWorkspace;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.SourceWorkspace;
import com.himma.envagent.module.workspace.vo.WorkspacePayloads.UsersWorkspace;

public interface WorkspaceService {

    DashboardSnapshot getDashboard();

    ChatWorkspace getChatWorkspace(Long userId);

    KnowledgeWorkspace getKnowledgeWorkspace();

    SourceWorkspace getSourceWorkspace();

    AgentWorkspace getAgentWorkspace();

    MonitorWorkspace getMonitorWorkspace();

    UsersWorkspace getUsersWorkspace();
}
