package com.himma.envagent.module.business.monitor.repository;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.himma.envagent.common.support.SnowflakeIdGenerator;
import com.himma.envagent.module.business.monitor.entity.MonitorStationEntity;
import com.himma.envagent.module.business.monitor.mapper.MonitorStationMapper;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class MonitorStationRepository {

    private final MonitorStationMapper monitorStationMapper;
    private final SnowflakeIdGenerator snowflakeIdGenerator;

    public MonitorStationRepository(MonitorStationMapper monitorStationMapper, SnowflakeIdGenerator snowflakeIdGenerator) {
        this.monitorStationMapper = monitorStationMapper;
        this.snowflakeIdGenerator = snowflakeIdGenerator;
    }

    public List<MonitorStationEntity> findAll() {
        return monitorStationMapper.selectList(new LambdaQueryWrapper<MonitorStationEntity>()
                .orderByAsc(MonitorStationEntity::getSt)
                .orderByAsc(MonitorStationEntity::getStationId)
                .orderByAsc(MonitorStationEntity::getId));
    }

    public Optional<MonitorStationEntity> findById(Long id) {
        return Optional.ofNullable(monitorStationMapper.selectById(id));
    }

    public Optional<MonitorStationEntity> findByStationId(String stationId) {
        return Optional.ofNullable(monitorStationMapper.selectOne(new LambdaQueryWrapper<MonitorStationEntity>()
                .eq(MonitorStationEntity::getStationId, stationId)
                .last("limit 1")));
    }

    public Optional<MonitorStationEntity> findByMn(String mn) {
        return Optional.ofNullable(monitorStationMapper.selectOne(new LambdaQueryWrapper<MonitorStationEntity>()
                .eq(MonitorStationEntity::getMn, mn)
                .last("limit 1")));
    }

    public MonitorStationEntity save(MonitorStationEntity entity) {
        if (entity.getId() == null) {
            entity.setId(snowflakeIdGenerator.nextId());
            monitorStationMapper.insert(entity);
        } else {
            monitorStationMapper.updateById(entity);
        }
        return entity;
    }

    public void deleteById(Long id) {
        monitorStationMapper.deleteById(id);
    }
}
