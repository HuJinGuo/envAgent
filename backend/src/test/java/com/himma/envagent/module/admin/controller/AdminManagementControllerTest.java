package com.himma.envagent.module.admin.controller;

import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
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
class AdminManagementControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldAllowAdminToManageRolesAndMenus() throws Exception {
        String token = loginAndGetToken("admin", "Env@123456");

        mockMvc.perform(get("/api/v1/admin/roles")
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data[*].code", hasItem("ADMIN")));

        mockMvc.perform(get("/api/v1/admin/menus")
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data[*].code", hasItem("admin")));

        mockMvc.perform(post("/api/v1/admin/vendors")
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "code": "test-vendor",
                                  "name": "Test Vendor",
                                  "baseUrl": "http://127.0.0.1:18000/v1",
                                  "apiKey": "sk-test-1234567890",
                                  "enabled": true,
                                  "sortOrder": 99
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.code").value("test-vendor"))
                .andExpect(jsonPath("$.data.apiKeyMasked").value("sk-****7890"));
    }

    @Test
    void shouldRejectInspectorFromWriteAdminEndpoints() throws Exception {
        String token = loginAndGetToken("inspector", "Env@123456");

        mockMvc.perform(post("/api/v1/admin/roles")
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "code": "TEMP",
                                  "name": "Temp Role"
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(40301));
    }

    @Test
    void shouldReturnRoleSpecificNavigation() throws Exception {
        String adminToken = loginAndGetToken("admin", "Env@123456");
        String inspectorToken = loginAndGetToken("inspector", "Env@123456");

        mockMvc.perform(get("/api/v1/admin/navigation")
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].code", hasItem("admin")))
                .andExpect(jsonPath("$.data[*].code", hasItem("monitor")))
                .andExpect(jsonPath("$.data[*].code", hasItem("users")));

        mockMvc.perform(get("/api/v1/admin/navigation")
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(inspectorToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].code", everyItem(not("admin"))))
                .andExpect(jsonPath("$.data[*].code", everyItem(not("monitor"))))
                .andExpect(jsonPath("$.data[*].code", everyItem(not("users"))))
                .andExpect(jsonPath("$.data[*].code", everyItem(not("kb"))))
                .andExpect(jsonPath("$.data[*].code", everyItem(not("agent"))))
                .andExpect(jsonPath("$.data[*].code", hasItem("dash")));
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
