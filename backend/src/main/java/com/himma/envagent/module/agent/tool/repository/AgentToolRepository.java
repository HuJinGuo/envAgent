package com.himma.envagent.module.agent.tool.repository;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.himma.envagent.common.support.SnowflakeIdGenerator;
import com.himma.envagent.module.agent.tool.entity.AgentToolEntity;
import com.himma.envagent.module.agent.tool.entity.AgentToolRoleEntity;
import com.himma.envagent.module.agent.tool.mapper.AgentToolMapper;
import com.himma.envagent.module.agent.tool.mapper.AgentToolRoleMapper;
import com.himma.envagent.module.agent.tool.repository.row.AgentToolSearchRow;
import java.sql.SQLException;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import javax.sql.DataSource;
import org.springframework.stereotype.Repository;

@Repository
public class AgentToolRepository {

    private final AgentToolMapper agentToolMapper;
    private final AgentToolRoleMapper agentToolRoleMapper;
    private final SnowflakeIdGenerator snowflakeIdGenerator;
    private final boolean postgres;

    public AgentToolRepository(AgentToolMapper agentToolMapper,
                               AgentToolRoleMapper agentToolRoleMapper,
                               SnowflakeIdGenerator snowflakeIdGenerator,
                               DataSource dataSource) throws SQLException {
        this.agentToolMapper = agentToolMapper;
        this.agentToolRoleMapper = agentToolRoleMapper;
        this.snowflakeIdGenerator = snowflakeIdGenerator;
        try (java.sql.Connection connection = dataSource.getConnection()) {
            this.postgres = connection.getMetaData().getDatabaseProductName().toLowerCase(Locale.ROOT).contains("postgres");
        }
    }

    public List<AgentToolEntity> findAll() {
        return agentToolMapper.selectList(new LambdaQueryWrapper<AgentToolEntity>()
                .orderByAsc(AgentToolEntity::getToolGroup)
                .orderByAsc(AgentToolEntity::getName)
                .orderByAsc(AgentToolEntity::getId));
    }

    public Optional<AgentToolEntity> findById(Long id) {
        return Optional.ofNullable(agentToolMapper.selectById(id));
    }

    public Optional<AgentToolEntity> findByName(String name) {
        return Optional.ofNullable(agentToolMapper.selectOne(new LambdaQueryWrapper<AgentToolEntity>()
                .eq(AgentToolEntity::getName, name)
                .last("limit 1")));
    }

    public AgentToolEntity save(AgentToolEntity entity) {
        if (entity.getId() == null) {
            entity.setId(snowflakeIdGenerator.nextId());
            if (postgres) {
                agentToolMapper.insertPostgres(entity);
            } else {
                agentToolMapper.insertDefault(entity);
            }
        } else {
            agentToolMapper.updateById(entity);
        }
        return entity;
    }

    public void updateEmbedding(AgentToolEntity entity) {
        agentToolMapper.updateById(entity);
    }

    public void deleteById(Long id) {
        agentToolRoleMapper.delete(new LambdaQueryWrapper<AgentToolRoleEntity>().eq(AgentToolRoleEntity::getToolId, id));
        agentToolMapper.deleteById(id);
    }

    public void replaceRoles(Long toolId, Collection<Long> roleIds) {
        agentToolRoleMapper.delete(new LambdaQueryWrapper<AgentToolRoleEntity>().eq(AgentToolRoleEntity::getToolId, toolId));
        for (Long roleId : roleIds) {
            addRoleIfMissing(toolId, roleId);
        }
    }

    public void addRoleIfMissing(Long toolId, Long roleId) {
        Long count = agentToolRoleMapper.selectCount(new LambdaQueryWrapper<AgentToolRoleEntity>()
                .eq(AgentToolRoleEntity::getToolId, toolId)
                .eq(AgentToolRoleEntity::getRoleId, roleId));
        if (count != null && count > 0) {
            return;
        }
        AgentToolRoleEntity entity = new AgentToolRoleEntity();
        entity.setId(snowflakeIdGenerator.nextId());
        entity.setToolId(toolId);
        entity.setRoleId(roleId);
        agentToolRoleMapper.insert(entity);
    }

    public List<Long> roleIdsByToolId(Long toolId) {
        return agentToolRoleMapper.selectList(new LambdaQueryWrapper<AgentToolRoleEntity>()
                        .eq(AgentToolRoleEntity::getToolId, toolId))
                .stream()
                .map(AgentToolRoleEntity::getRoleId)
                .sorted()
                .toList();
    }

    public List<AgentToolSearchRow> searchByVector(String queryEmbedding, String groupName, Long roleId, int limit) {
        return agentToolMapper.searchByVector(queryEmbedding, groupName, roleId, limit);
    }
}
