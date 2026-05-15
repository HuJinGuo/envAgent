package com.himma.envagent.module.agent.service;

import com.himma.envagent.module.agent.repository.AgentTaskRepository;
import com.himma.envagent.module.agent.tool.AgentTool;
import com.himma.envagent.module.agent.vo.AgentPayloads.AgentLogItem;
import com.himma.envagent.module.agent.vo.AgentPayloads.AgentTaskDetail;
import com.himma.envagent.module.agent.vo.AgentPayloads.AgentTaskItem;
import com.himma.envagent.module.agent.vo.AgentPayloads.ToolInfo;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class AgentTaskService {

    private final AgentTaskRepository agentTaskRepository;
    private final AgentTaskRunner agentTaskRunner;
    private final List<AgentTool> availableTools;

    public AgentTaskService(
            AgentTaskRepository agentTaskRepository,
            AgentTaskRunner agentTaskRunner,
            List<AgentTool> availableTools
    ) {
        this.agentTaskRepository = agentTaskRepository;
        this.agentTaskRunner = agentTaskRunner;
        this.availableTools = availableTools;
    }

    public AgentTaskItem createAndSubmit(long userId, String instruction) {
        long taskId = agentTaskRepository.createTask(userId, instruction);
        agentTaskRunner.run(taskId, instruction);
        return agentTaskRepository.findTask(taskId)
                .orElseThrow(() -> new IllegalStateException("task not found after creation"));
    }

    public List<AgentTaskItem> listRecent(long userId) {
        return agentTaskRepository.listRecentTasks(userId, 20);
    }

    public AgentTaskDetail getDetail(long taskId) {
        AgentTaskItem task = agentTaskRepository.findTask(taskId)
                .orElseThrow(() -> new IllegalStateException("task not found: " + taskId));
        List<AgentLogItem> logs = agentTaskRepository.listLogs(taskId);
        return new AgentTaskDetail(task, logs);
    }

    public List<ToolInfo> listTools() {
        return availableTools.stream()
                .map(t -> new ToolInfo(t.id(), t.name(), t.description(), "available"))
                .toList();
    }

    public long countActive() {
        return agentTaskRepository.countByStatus(com.himma.envagent.module.agent.domain.AgentTaskStatus.RUNNING)
                + agentTaskRepository.countByStatus(com.himma.envagent.module.agent.domain.AgentTaskStatus.PENDING);
    }

    public long countDone() {
        return agentTaskRepository.countByStatus(com.himma.envagent.module.agent.domain.AgentTaskStatus.DONE);
    }
}
