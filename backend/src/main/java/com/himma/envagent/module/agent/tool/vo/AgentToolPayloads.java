package com.himma.envagent.module.agent.tool.vo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;

public final class AgentToolPayloads {

    private AgentToolPayloads() {
    }

    public record ToolItem(
            Long id,
            String name,
            String description,
            String parametersSchema,
            String toolGroup,
            List<String> tags,
            String version,
            Boolean enabled,
            String embeddingStatus,
            String embeddingError,
            Long hitCount,
            Long callCount,
            Long successCount,
            Double successRate,
            List<Long> roleIds,
            List<String> roleCodes,
            List<String> roleNames,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
    }

    public record ToolRequest(
            @NotBlank String name,
            String description,
            String parametersSchema,
            String toolGroup,
            List<String> tags,
            String version,
            Boolean enabled
    ) {
    }

    public record ToolRolesRequest(@NotNull List<Long> roleIds) {
    }

    public record ToolSearchRequest(@NotBlank String query, String roleCode, String groupName, Integer limit) {
    }

    public record ToolSearchResultItem(
            Long id,
            String name,
            String toolGroup,
            String description,
            Double similarity,
            String embeddingStatus,
            List<String> roleCodes,
            List<String> roleNames,
            List<String> tags
    ) {
    }
}
