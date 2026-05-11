package com.himma.envagent.module.system.controller;

import com.himma.envagent.common.api.ApiResponse;
import com.himma.envagent.common.config.OpenAiProperties;
import com.himma.envagent.common.config.VectorProperties;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/system")
public class SystemController {

    private final OpenAiProperties openAiProperties;
    private final VectorProperties vectorProperties;

    @Value("${spring.application.name}")
    private String applicationName;

    public SystemController(OpenAiProperties openAiProperties, VectorProperties vectorProperties) {
        this.openAiProperties = openAiProperties;
        this.vectorProperties = vectorProperties;
    }

    @GetMapping("/health")
    public ApiResponse<Map<String, Object>> health() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("service", applicationName);
        payload.put("status", "UP");
        payload.put("openAiBaseUrl", openAiProperties.getBaseUrl());
        payload.put("chatModel", openAiProperties.getChatModel());
        payload.put("embeddingModel", openAiProperties.getEmbeddingModel());
        payload.put("vectorDimensions", vectorProperties.getDimensions());
        payload.put("similarityThreshold", vectorProperties.getSimilarityThreshold());
        return ApiResponse.success(payload);
    }
}
