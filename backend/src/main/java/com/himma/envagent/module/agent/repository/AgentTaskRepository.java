package com.himma.envagent.module.agent.repository;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.himma.envagent.common.support.SnowflakeIdGenerator;
import com.himma.envagent.module.agent.domain.AgentTaskStatus;
import com.himma.envagent.module.agent.entity.AgentTaskEntity;
import com.himma.envagent.module.agent.entity.AgentTaskLogEntity;
import com.himma.envagent.module.agent.mapper.AgentTaskLogMapper;
import com.himma.envagent.module.agent.mapper.AgentTaskMapper;
import com.himma.envagent.module.agent.vo.AgentPayloads.AgentLogItem;
import com.himma.envagent.module.agent.vo.AgentPayloads.AgentTaskItem;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class AgentTaskRepository {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("MM-dd HH:mm:ss");

    private final AgentTaskMapper agentTaskMapper;
    private final AgentTaskLogMapper agentTaskLogMapper;
    private final SnowflakeIdGenerator snowflakeIdGenerator;

    public AgentTaskRepository(
            AgentTaskMapper agentTaskMapper,
            AgentTaskLogMapper agentTaskLogMapper,
            SnowflakeIdGenerator snowflakeIdGenerator
    ) {
        this.agentTaskMapper = agentTaskMapper;
        this.agentTaskLogMapper = agentTaskLogMapper;
        this.snowflakeIdGenerator = snowflakeIdGenerator;
    }

    public long createTask(long userId, String instruction) {
        AgentTaskEntity entity = new AgentTaskEntity();
        entity.setId(snowflakeIdGenerator.nextId());
        entity.setUserId(userId);
        entity.setInstruction(instruction);
        entity.setStatus(AgentTaskStatus.PENDING.name());
        entity.setCreatedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());
        agentTaskMapper.insert(entity);
        return entity.getId();
    }

    public void updateStatus(long taskId, AgentTaskStatus status, String currentStep) {
        agentTaskMapper.update(null, new LambdaUpdateWrapper<AgentTaskEntity>()
                .eq(AgentTaskEntity::getId, taskId)
                .set(AgentTaskEntity::getStatus, status.name())
                .set(AgentTaskEntity::getCurrentStep, currentStep)
                .set(AgentTaskEntity::getUpdatedAt, LocalDateTime.now()));
    }

    public void updateDone(long taskId, String output) {
        agentTaskMapper.update(null, new LambdaUpdateWrapper<AgentTaskEntity>()
                .eq(AgentTaskEntity::getId, taskId)
                .set(AgentTaskEntity::getStatus, AgentTaskStatus.DONE.name())
                .set(AgentTaskEntity::getCurrentStep, null)
                .set(AgentTaskEntity::getOutput, output)
                .set(AgentTaskEntity::getUpdatedAt, LocalDateTime.now()));
    }

    public void updateFailed(long taskId, String errorMsg) {
        agentTaskMapper.update(null, new LambdaUpdateWrapper<AgentTaskEntity>()
                .eq(AgentTaskEntity::getId, taskId)
                .set(AgentTaskEntity::getStatus, AgentTaskStatus.FAILED.name())
                .set(AgentTaskEntity::getCurrentStep, null)
                .set(AgentTaskEntity::getErrorMsg, errorMsg)
                .set(AgentTaskEntity::getUpdatedAt, LocalDateTime.now()));
    }

    public long appendLog(long taskId, String step, String status, String line) {
        AgentTaskLogEntity entity = new AgentTaskLogEntity();
        entity.setId(snowflakeIdGenerator.nextId());
        entity.setTaskId(taskId);
        entity.setStep(step);
        entity.setStatus(status);
        entity.setLine(line);
        entity.setCreatedAt(LocalDateTime.now());
        agentTaskLogMapper.insert(entity);
        return entity.getId();
    }

    public Optional<AgentTaskItem> findTask(long taskId) {
        AgentTaskEntity entity = agentTaskMapper.selectById(taskId);
        return Optional.ofNullable(entity).map(this::toItem);
    }

    public List<AgentTaskItem> listRecentTasks(long userId, int limit) {
        return agentTaskMapper.selectList(new LambdaQueryWrapper<AgentTaskEntity>()
                .eq(AgentTaskEntity::getUserId, userId)
                .orderByDesc(AgentTaskEntity::getCreatedAt)
                .last("LIMIT " + limit)
        ).stream().map(this::toItem).toList();
    }

    public List<AgentLogItem> listLogs(long taskId) {
        return agentTaskLogMapper.selectByTaskId(taskId).stream()
                .map(this::toLogItem)
                .toList();
    }

    public long countByStatus(AgentTaskStatus status) {
        return agentTaskMapper.selectCount(new LambdaQueryWrapper<AgentTaskEntity>()
                .eq(AgentTaskEntity::getStatus, status.name()));
    }

    private AgentTaskItem toItem(AgentTaskEntity entity) {
        return new AgentTaskItem(
                String.valueOf(entity.getId()),
                entity.getInstruction(),
                entity.getStatus(),
                entity.getCurrentStep(),
                entity.getOutput(),
                entity.getErrorMsg(),
                entity.getCreatedAt() == null ? "" : entity.getCreatedAt().format(FORMATTER),
                entity.getUpdatedAt() == null ? "" : entity.getUpdatedAt().format(FORMATTER)
        );
    }

    private AgentLogItem toLogItem(AgentTaskLogEntity entity) {
        return new AgentLogItem(
                String.valueOf(entity.getId()),
                String.valueOf(entity.getTaskId()),
                entity.getStep(),
                entity.getStatus(),
                entity.getLine(),
                entity.getCreatedAt() == null ? "" : entity.getCreatedAt().format(FORMATTER)
        );
    }
}
