package com.himma.envagent;

import com.himma.envagent.common.config.OpenAiProperties;
import com.himma.envagent.common.config.VectorProperties;
import com.himma.envagent.module.auth.config.JwtProperties;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableAsync;

@EnableAsync
@MapperScan("com.himma.envagent.**.mapper")
@EnableConfigurationProperties({OpenAiProperties.class, VectorProperties.class, JwtProperties.class})
@SpringBootApplication
public class EnvAgentBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(EnvAgentBackendApplication.class, args);
    }
}
