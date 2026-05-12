package com.himma.envagent.module.workspace.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
class WorkspaceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldRequireAuthenticationForWorkspaceEndpoints() throws Exception {
        mockMvc.perform(get("/api/v1/workspaces/dashboard"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(40100))
                .andExpect(jsonPath("$.msg").value("未登录或令牌无效"));
    }

    @Test
    void shouldAllowAdminToAccessRestrictedEndpoints() throws Exception {
        String token = loginAndGetToken("admin", "Env@123456");

        mockMvc.perform(get("/api/v1/workspaces/monitor")
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.availability").value("99.8%"))
                .andExpect(jsonPath("$.data.recentCalls[0].status").value("成功"));

        mockMvc.perform(get("/api/v1/workspaces/users")
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.users[0].role").value("管理层"))
                .andExpect(jsonPath("$.data.permissions[5].module").value("系统监控"));
    }

    @Test
    void shouldAllowAnalystToAccessKnowledgeAndAgentButNotUsers() throws Exception {
        String token = loginAndGetToken("analyst", "Env@123456");

        mockMvc.perform(get("/api/v1/workspaces/knowledge")
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.summary[0].label").value("知识库总量"))
                .andExpect(jsonPath("$.data.categories[0].id").value("all"));

        mockMvc.perform(get("/api/v1/workspaces/agent")
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.flow[2].status").value("running"));

        mockMvc.perform(get("/api/v1/workspaces/users")
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(token)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(40301))
                .andExpect(jsonPath("$.msg").value("监测分析员无权访问用户管理工作台"));
    }

    @Test
    void shouldRejectInspectorFromRestrictedWorkspace() throws Exception {
        String token = loginAndGetToken("inspector", "Env@123456");

        mockMvc.perform(get("/api/v1/workspaces/knowledge")
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(token)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(40301))
                .andExpect(jsonPath("$.msg").value("执法人员无权访问知识库工作台"));
    }

    @Test
    void shouldExposeCompatiblePayloadForSharedWorkspaceEndpoints() throws Exception {
        String token = loginAndGetToken("inspector", "Env@123456");

        mockMvc.perform(get("/api/v1/workspaces/dashboard")
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.todayQuestions").value(38))
                .andExpect(jsonPath("$.data.recentQuestions[0].id").value("q1"));

        mockMvc.perform(get("/api/v1/workspaces/chat")
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sessions").isArray())
                .andExpect(jsonPath("$.data.suggestions").isArray())
                .andExpect(jsonPath("$.data.references").isArray());

        mockMvc.perform(get("/api/v1/workspaces/source")
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.enterprises[0].monitorStatus").value("超标"));
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
