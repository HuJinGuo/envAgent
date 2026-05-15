package com.himma.envagent.module.agent.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.himma.envagent.module.agent.entity.AgentTaskLogEntity;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface AgentTaskLogMapper extends BaseMapper<AgentTaskLogEntity> {

    @Select("SELECT * FROM agent_task_logs WHERE task_id = #{taskId} ORDER BY id ASC")
    List<AgentTaskLogEntity> selectByTaskId(@Param("taskId") long taskId);
}
