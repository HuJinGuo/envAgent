package com.himma.envagent.module.agent.tool.controller;

import com.himma.envagent.common.api.ApiResponse;
import com.himma.envagent.module.agent.tool.service.AgentToolService;
import com.himma.envagent.module.agent.tool.vo.AgentToolPayloads.ToolItem;
import com.himma.envagent.module.agent.tool.vo.AgentToolPayloads.ToolRequest;
import com.himma.envagent.module.agent.tool.vo.AgentToolPayloads.ToolRolesRequest;
import com.himma.envagent.module.agent.tool.vo.AgentToolPayloads.ToolSearchRequest;
import com.himma.envagent.module.agent.tool.vo.AgentToolPayloads.ToolSearchResultItem;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/agent/tools")
public class AgentToolController {

    private final AgentToolService agentToolService;

    public AgentToolController(AgentToolService agentToolService) {
        this.agentToolService = agentToolService;
    }

    @GetMapping
    public ApiResponse<List<ToolItem>> list(Authentication authentication) {
        return ApiResponse.success(agentToolService.list(authentication));
    }

    @PostMapping
    public ApiResponse<ToolItem> create(Authentication authentication, @Valid @RequestBody ToolRequest request) {
        return ApiResponse.success(agentToolService.create(authentication, request));
    }

    @PutMapping("/{id}")
    public ApiResponse<ToolItem> update(Authentication authentication, @PathVariable Long id,
                                        @Valid @RequestBody ToolRequest request) {
        return ApiResponse.success(agentToolService.update(authentication, id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(Authentication authentication, @PathVariable Long id) {
        agentToolService.delete(authentication, id);
        return ApiResponse.success(null);
    }

    @PutMapping("/{id}/roles")
    public ApiResponse<Void> replaceRoles(Authentication authentication, @PathVariable Long id,
                                          @Valid @RequestBody ToolRolesRequest request) {
        agentToolService.replaceRoles(authentication, id, request.roleIds());
        return ApiResponse.success(null);
    }

    @PostMapping("/test-search")
    public ApiResponse<List<ToolSearchResultItem>> testSearch(Authentication authentication,
                                                              @Valid @RequestBody ToolSearchRequest request) {
        return ApiResponse.success(agentToolService.testSearch(authentication, request));
    }
}
