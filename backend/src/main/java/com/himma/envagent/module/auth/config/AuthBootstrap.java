package com.himma.envagent.module.auth.config;

import com.himma.envagent.module.auth.service.UserService;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AuthBootstrap {

    @Bean
    public ApplicationRunner authApplicationRunner(UserService userService) {
        return args -> userService.ensureDefaultUsers();
    }
}
