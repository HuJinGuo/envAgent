package com.himma.envagent.module.auth.service;

import com.himma.envagent.module.auth.domain.UserEntity;
import java.util.Optional;

public interface JwtService {

    String generateToken(UserEntity user);

    Optional<String> extractUsername(String token);

    boolean isTokenValid(String token, UserEntity user);

    long getExpirationSeconds();
}
