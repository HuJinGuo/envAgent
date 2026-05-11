package com.himma.envagent.module.auth.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.himma.envagent.module.auth.domain.UserEntity;
import com.himma.envagent.module.auth.domain.UserRole;
import com.himma.envagent.module.auth.domain.UserStatus;
import com.himma.envagent.module.auth.mapper.UserMapper;
import com.himma.envagent.module.auth.service.UserService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserServiceImpl implements UserService {

    private static final String DEFAULT_PASSWORD = "Env@123456";

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    public UserServiceImpl(UserMapper userMapper, PasswordEncoder passwordEncoder) {
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public Optional<UserEntity> findByUsername(String username) {
        LambdaQueryWrapper<UserEntity> wrapper = new LambdaQueryWrapper<UserEntity>()
                .eq(UserEntity::getUsername, username)
                .last("limit 1");
        return Optional.ofNullable(userMapper.selectOne(wrapper));
    }

    @Override
    @Transactional
    public void ensureDefaultUsers() {
        createIfAbsent("inspector", UserRole.INSPECTOR.name(), "执法科");
        createIfAbsent("analyst", UserRole.ANALYST.name(), "监测中心");
        createIfAbsent("admin", UserRole.ADMIN.name(), "信息中心");
    }

    @Override
    @Transactional
    public void updateLastLogin(Long userId) {
        UserEntity entity = new UserEntity();
        entity.setId(userId);
        entity.setLastLoginAt(LocalDateTime.now());
        userMapper.updateById(entity);
    }

    private void createIfAbsent(String username, String role, String dept) {
        if (findByUsername(username).isPresent()) {
            return;
        }
        UserEntity entity = new UserEntity();
        entity.setUsername(username);
        entity.setPasswordHash(passwordEncoder.encode(DEFAULT_PASSWORD));
        entity.setRole(role);
        entity.setDept(dept);
        entity.setStatus(UserStatus.ACTIVE.name());
        entity.setCreatedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());
        userMapper.insert(entity);
    }
}
