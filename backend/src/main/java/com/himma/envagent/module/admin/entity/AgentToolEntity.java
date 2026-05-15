package com.himma.envagent.module.admin.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("agent_tools")
public class AgentToolEntity {

    @TableId(type = IdType.INPUT)
    private Long id;
    private String name;
    private String description;
    private String parametersSchema;
    private String toolGroup;
    private String tags;
    private String version;
    private Boolean enabled;
    private String embedding;
    private String embeddingStatus;
    private String embeddingError;
    private Long hitCount;
    private Long callCount;
    private Long successCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getParametersSchema() { return parametersSchema; }
    public void setParametersSchema(String parametersSchema) { this.parametersSchema = parametersSchema; }
    public String getToolGroup() { return toolGroup; }
    public void setToolGroup(String toolGroup) { this.toolGroup = toolGroup; }
    public String getTags() { return tags; }
    public void setTags(String tags) { this.tags = tags; }
    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }
    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    public String getEmbedding() { return embedding; }
    public void setEmbedding(String embedding) { this.embedding = embedding; }
    public String getEmbeddingStatus() { return embeddingStatus; }
    public void setEmbeddingStatus(String embeddingStatus) { this.embeddingStatus = embeddingStatus; }
    public String getEmbeddingError() { return embeddingError; }
    public void setEmbeddingError(String embeddingError) { this.embeddingError = embeddingError; }
    public Long getHitCount() { return hitCount; }
    public void setHitCount(Long hitCount) { this.hitCount = hitCount; }
    public Long getCallCount() { return callCount; }
    public void setCallCount(Long callCount) { this.callCount = callCount; }
    public Long getSuccessCount() { return successCount; }
    public void setSuccessCount(Long successCount) { this.successCount = successCount; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
