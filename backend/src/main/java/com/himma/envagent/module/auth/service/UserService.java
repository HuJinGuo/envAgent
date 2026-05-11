package com.himma.envagent.module.auth.service;

import com.himma.envagent.module.auth.domain.UserEntity;
import java.util.Optional;

public interface UserService {

    Optional<UserEntity> findByUsername(String username);

    void ensureDefaultUsers();

    void updateLastLogin(Long userId);
}
