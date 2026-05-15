package com.himma.envagent.module.business.monitor.repository;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.himma.envagent.common.support.SnowflakeIdGenerator;
import com.himma.envagent.module.business.monitor.entity.MonitorDataEntity;
import com.himma.envagent.module.business.monitor.mapper.MonitorDataMapper;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class MonitorDataRepository {

    private final MonitorDataMapper monitorDataMapper;
    private final SnowflakeIdGenerator snowflakeIdGenerator;

    public MonitorDataRepository(MonitorDataMapper monitorDataMapper, SnowflakeIdGenerator snowflakeIdGenerator) {
        this.monitorDataMapper = monitorDataMapper;
        this.snowflakeIdGenerator = snowflakeIdGenerator;
    }

    public List<MonitorDataEntity> findAll() {
        return monitorDataMapper.selectList(new LambdaQueryWrapper<MonitorDataEntity>()
                .orderByDesc(MonitorDataEntity::getDataTime)
                .orderByAsc(MonitorDataEntity::getMn)
                .orderByAsc(MonitorDataEntity::getParamCode)
                .orderByAsc(MonitorDataEntity::getId));
    }

    public Optional<MonitorDataEntity> findById(Long id) {
        return Optional.ofNullable(monitorDataMapper.selectById(id));
    }

    public boolean hasAny() {
        return monitorDataMapper.selectCount(new LambdaQueryWrapper<>()) > 0;
    }

    public MonitorDataEntity save(MonitorDataEntity entity) {
        if (entity.getId() == null) {
            entity.setId(snowflakeIdGenerator.nextId());
            monitorDataMapper.insert(entity);
        } else {
            monitorDataMapper.updateById(entity);
        }
        return entity;
    }

    public void deleteById(Long id) {
        monitorDataMapper.deleteById(id);
    }

    public void deleteByMnAndTime(String mn, LocalDateTime dataTime) {
        monitorDataMapper.delete(new LambdaQueryWrapper<MonitorDataEntity>()
                .eq(MonitorDataEntity::getMn, mn)
                .eq(MonitorDataEntity::getDataTime, dataTime));
    }
}
