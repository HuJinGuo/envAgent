package com.himma.envagent.module.auth.service.impl;

import com.himma.envagent.common.exception.BusinessException;
import com.himma.envagent.module.auth.domain.UserEntity;
import com.himma.envagent.module.auth.domain.UserStatus;
import com.himma.envagent.module.auth.dto.LoginRequest;
import com.himma.envagent.module.auth.service.AuthService;
import com.himma.envagent.module.auth.service.JwtService;
import com.himma.envagent.module.auth.service.UserService;
import com.himma.envagent.module.auth.vo.LoginResponse;
import com.himma.envagent.module.auth.vo.UserProfileVO;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthServiceImpl(UserService userService, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Override
    @Transactional
    public LoginResponse login(LoginRequest request) {
        UserEntity user = userService.findByUsername(request.getUsername())
                .orElseThrow(() -> new BusinessException(401, "invalid username or password"));

        if (!UserStatus.ACTIVE.name().equals(user.getStatus())) {
            throw new BusinessException(403, "user is disabled");
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BusinessException(401, "invalid username or password");
        }

        userService.updateLastLogin(user.getId());
        LoginResponse response = new LoginResponse();
        response.setToken(jwtService.generateToken(user));
        response.setTokenType("Bearer");
        response.setExpiresIn(jwtService.getExpirationSeconds());
        response.setUser(toProfile(user));
        return response;
    }

    @Override
    public UserProfileVO currentUser(String username) {
        UserEntity user = userService.findByUsername(username)
                .orElseThrow(() -> new BusinessException(404, "user not found"));
        return toProfile(user);
    }

    private UserProfileVO toProfile(UserEntity user) {
        UserProfileVO profile = new UserProfileVO();
        profile.setId(user.getId());
        profile.setUsername(user.getUsername());
        profile.setRole(user.getRole());
        profile.setDept(user.getDept());
        profile.setStatus(user.getStatus());
        return profile;
    }
}
