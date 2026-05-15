package com.himma.envagent.module.admin.vo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;

public final class AdminPayloads {

    private AdminPayloads() {
    }

    public record RoleItem(Long id, String code, String name, String description, Integer sortOrder,
                           Boolean enabled, List<Long> menuIds, LocalDateTime createdAt, LocalDateTime updatedAt) {
    }

    public record RoleRequest(@NotBlank String code, @NotBlank String name, String description,
                              Integer sortOrder, Boolean enabled) {
    }

    public record MenuItem(Long id, Long parentId, String code, String name, String title, String path,
                           String component, String icon, String redirect, Integer sortOrder,
                           Boolean visible, LocalDateTime createdAt, LocalDateTime updatedAt) {
    }

    public record MenuTreeItem(Long id, Long parentId, String code, String name, String title, String path,
                               String component, String icon, String redirect, Integer sortOrder,
                               Boolean visible, List<MenuTreeItem> children) {
    }

    public record MenuRequest(Long parentId, @NotBlank String code, @NotBlank String name, @NotBlank String title,
                              @NotBlank String path, String component, String icon, String redirect,
                              Integer sortOrder, Boolean visible) {
    }

    public record RoleMenusRequest(@NotNull List<Long> menuIds) {
    }

    public record UserItem(Long id, String username, String roleCode, String roleName, String dept, String status,
                           LocalDateTime lastLoginAt, LocalDateTime createdAt, LocalDateTime updatedAt) {
    }

    public record UserRequest(@NotBlank String username, String password, @NotBlank String roleCode,
                              String dept, String status) {
    }

    public record DictItem(Long id, String dictType, String dictLabel, String dictValue, String description,
                           Boolean enabled, Integer sortOrder, LocalDateTime createdAt, LocalDateTime updatedAt) {
    }

    public record DictRequest(@NotBlank String dictType, @NotBlank String dictLabel, @NotBlank String dictValue,
                              String description, Boolean enabled, Integer sortOrder) {
    }

    public record VendorItem(Long id, String code, String name, String baseUrl, String apiKeyMasked,
                             String description, Boolean enabled, Integer sortOrder, LocalDateTime createdAt,
                             LocalDateTime updatedAt) {
    }

    public record VendorRequest(@NotBlank String code, @NotBlank String name, String baseUrl, String apiKey,
                                String description, Boolean enabled, Integer sortOrder) {
    }

    public record ModelItem(Long id, Long vendorId, String vendorName, String code, String name, String modelType,
                            Integer contextWindow, Integer maxOutputTokens, Boolean enabled, Integer sortOrder,
                            LocalDateTime createdAt, LocalDateTime updatedAt) {
    }

    public record ModelRequest(@NotNull Long vendorId, @NotBlank String code, @NotBlank String name,
                               String modelType, Integer contextWindow, Integer maxOutputTokens,
                               Boolean enabled, Integer sortOrder) {
    }

    public record KnowledgeBaseItem(Long id, String code, String name, String description, Integer sortOrder,
                                    Long createdBy, LocalDateTime createdAt, LocalDateTime updatedAt) {
    }

    public record KnowledgeBaseRequest(@NotBlank String code, @NotBlank String name, String description,
                                       Integer sortOrder, Long createdBy) {
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

    public record StationItem(Long id, String stationId, String mn, Double lat, Double lng, String mnName,
                              Integer st, LocalDateTime createdAt, LocalDateTime updatedAt) {
    }

    public record StationRequest(@NotBlank String stationId, @NotBlank String mn, @NotNull Double lat,
                                 @NotNull Double lng, @NotBlank String mnName, @NotNull Integer st) {
    }

    public record MonitorDataItem(Long id, String mn, String paramCode, String paramName, Double value,
                                  LocalDateTime dataTime, LocalDateTime createdAt, LocalDateTime updatedAt) {
    }

    public record MonitorDataRequest(@NotBlank String mn, @NotBlank String paramCode, @NotBlank String paramName,
                                     @NotNull Double value, @NotNull LocalDateTime dataTime) {
    }

    public record MonitorDataRangeRequest(@NotBlank String paramCode, @NotBlank String paramName, @NotNull Double minValue,
                                          @NotNull Double maxValue) {
    }

    public record MonitorDataSimulateRequest(@NotBlank String mn, @NotNull LocalDateTime dataTime,
                                             @NotNull List<MonitorDataRangeRequest> ranges) {
    }
}
