package com.himma.envagent.module.auth.controller;

import com.himma.envagent.common.api.ApiResponse;
import com.himma.envagent.module.auth.dto.LoginRequest;
import com.himma.envagent.module.auth.service.AuthService;
import com.himma.envagent.module.auth.vo.LoginResponse;
import com.himma.envagent.module.auth.vo.UserProfileVO;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.success(authService.login(request));
    }

    @GetMapping("/me")
    public ApiResponse<UserProfileVO> me(Authentication authentication) {
        return ApiResponse.success(authService.currentUser(authentication.getName()));
    }
}
