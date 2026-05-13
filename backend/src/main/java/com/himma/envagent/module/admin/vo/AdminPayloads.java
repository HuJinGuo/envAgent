package com.himma.envagent.module.admin.vo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;

public final class AdminPayloads {

    private AdminPayloads() {
    }

    public record RoleItem(Long id, String code, String name, String description, Integer sortOrder,
                           Boolean enabled, LocalDateTime createdAt, LocalDateTime updatedAt) {
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

    public record VendorItem(Long id, String code, String name, String baseUrl, String apiKeyMasked,
                             String description, Boolean enabled, Integer sortOrder, LocalDateTime createdAt,
                             LocalDateTime updatedAt) {
    }

    public record VendorRequest(@NotBlank String code, @NotBlank String name, String baseUrl, String apiKeyMasked,
                                String description, Boolean enabled, Integer sortOrder) {
    }

    public record ModelItem(Long id, Long vendorId, String code, String name, String modelType,
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
}
