package com.himma.envagent.module.auth.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.himma.envagent.module.auth.domain.UserEntity;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper extends BaseMapper<UserEntity> {
}
