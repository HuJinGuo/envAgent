package com.himma.envagent.module.agent.vo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public final class AgentPayloads {

    private AgentPayloads() {
    }

    public record CreateTaskRequest(
            @NotBlank @Size(max = 2000) String instruction
    ) {
    }

    public record AgentTaskItem(
            String id,
            String instruction,
            String status,
            String currentStep,
            String output,
            String errorMsg,
            String createdAt,
            String updatedAt
    ) {
    }

    public record AgentLogItem(
            String id,
            String taskId,
            String step,
            String status,
            String line,
            String createdAt
    ) {
    }

    public record AgentTaskDetail(
            AgentTaskItem task,
            List<AgentLogItem> logs
    ) {
    }

    public record ToolInfo(
            String id,
            String name,
            String description,
            String status
    ) {
    }
}
