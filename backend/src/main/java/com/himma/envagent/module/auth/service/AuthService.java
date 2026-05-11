package com.himma.envagent.module.auth.service;

import com.himma.envagent.module.auth.dto.LoginRequest;
import com.himma.envagent.module.auth.vo.LoginResponse;
import com.himma.envagent.module.auth.vo.UserProfileVO;

public interface AuthService {

    LoginResponse login(LoginRequest request);

    UserProfileVO currentUser(String username);
}
