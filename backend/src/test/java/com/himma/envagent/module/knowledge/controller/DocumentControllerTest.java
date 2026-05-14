package com.himma.envagent.module.knowledge.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.himma.envagent.module.knowledge.domain.DocumentStatus;
import com.himma.envagent.module.knowledge.repository.DocumentChunkRepository;
import com.himma.envagent.module.knowledge.repository.DocumentRepository;
import com.himma.envagent.module.knowledge.vo.KnowledgePayloads.ChunkPayload;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
class DocumentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private DocumentChunkRepository documentChunkRepository;

    @Test
    void shouldSerializeSnowflakeDocumentAndChunkIdsAsStrings() throws Exception {
        long documentId = documentRepository.insert(
                null,
                "snowflake-id-check.txt",
                "text/plain",
                "/tmp/snowflake-id-check.txt",
                128L,
                1L
        );
        documentChunkRepository.replaceChunks(documentId, List.of(
                new ChunkPayload(
                        "用于验证 knowledge 接口中的雪花 ID 返回格式。",
                        0,
                        12,
                        "[0.1,0.2,0.3]",
                        "text",
                        "{\"chunkType\":\"text\",\"headingPath\":[]}"
                )
        ));
        documentRepository.updateStatus(documentId, DocumentStatus.READY, 1, null);

        String token = loginAndGetToken("admin", "Env@123456");

        mockMvc.perform(get("/api/v1/documents")
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").isString());

        mockMvc.perform(get("/api/v1/documents/{id}", documentId)
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").isString())
                .andExpect(jsonPath("$.data.id").value(String.valueOf(documentId)));

        mockMvc.perform(get("/api/v1/documents/{id}/chunks", documentId)
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").isString())
                .andExpect(jsonPath("$.data[0].documentId").isString())
                .andExpect(jsonPath("$.data[0].documentId").value(String.valueOf(documentId)));
    }

    private String loginAndGetToken(String username, String password) throws Exception {
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "%s",
                                  "password": "%s"
                                }
                                """.formatted(username, password)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andReturn();
        String body = loginResult.getResponse().getContentAsString();
        return body.replaceAll(".*\\\"token\\\":\\\"([^\\\"]+)\\\".*", "$1");
    }

    private String bearerToken(String token) {
        return "Bearer " + token;
    }
}
