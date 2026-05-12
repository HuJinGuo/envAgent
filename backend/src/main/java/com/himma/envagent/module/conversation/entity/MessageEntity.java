package com.himma.envagent.module.conversation.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("messages")
public class MessageEntity {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("conv_id")
    private Long convId;

    private String role;

    private String content;

    private String sources;

    @TableField("in_tokens")
    private Integer inTokens;

    @TableField("out_tokens")
    private Integer outTokens;

    @TableField("created_at")
    private LocalDateTime createdAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getConvId() {
        return convId;
    }

    public void setConvId(Long convId) {
        this.convId = convId;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getSources() {
        return sources;
    }

    public void setSources(String sources) {
        this.sources = sources;
    }

    public Integer getInTokens() {
        return inTokens;
    }

    public void setInTokens(Integer inTokens) {
        this.inTokens = inTokens;
    }

    public Integer getOutTokens() {
        return outTokens;
    }

    public void setOutTokens(Integer outTokens) {
        this.outTokens = outTokens;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
