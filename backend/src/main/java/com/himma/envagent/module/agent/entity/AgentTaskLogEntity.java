package com.himma.envagent.module.agent.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("agent_task_logs")
public class AgentTaskLogEntity {

    @TableId(type = IdType.INPUT)
    private Long id;

    @TableField("task_id")
    private Long taskId;

    private String step;

    private String status;

    private String line;

    @TableField("created_at")
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTaskId() { return taskId; }
    public void setTaskId(Long taskId) { this.taskId = taskId; }

    public String getStep() { return step; }
    public void setStep(String step) { this.step = step; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getLine() { return line; }
    public void setLine(String line) { this.line = line; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
