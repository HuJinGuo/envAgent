package com.himma.envagent.module.agent.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.himma.envagent.common.api.ApiResponse;
import com.himma.envagent.module.agent.domain.AgentTaskStatus;
import com.himma.envagent.module.agent.service.AgentEventBus;
import com.himma.envagent.module.agent.service.AgentTaskService;
import com.himma.envagent.module.agent.vo.AgentPayloads.AgentLogItem;
import com.himma.envagent.module.agent.vo.AgentPayloads.AgentTaskDetail;
import com.himma.envagent.module.agent.vo.AgentPayloads.AgentTaskItem;
import com.himma.envagent.module.agent.vo.AgentPayloads.CreateTaskRequest;
import com.himma.envagent.module.agent.vo.AgentPayloads.ToolInfo;
import com.himma.envagent.module.auth.service.UserService;
import jakarta.validation.Valid;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.TimeUnit;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
@RequestMapping("/api/v1/agent")
public class AgentTaskController {

    private final AgentTaskService agentTaskService;
    private final AgentEventBus agentEventBus;
    private final UserService userService;
    private final ObjectMapper objectMapper;

    public AgentTaskController(
            AgentTaskService agentTaskService,
            AgentEventBus agentEventBus,
            UserService userService,
            ObjectMapper objectMapper
    ) {
        this.agentTaskService = agentTaskService;
        this.agentEventBus = agentEventBus;
        this.userService = userService;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/tasks")
    public ApiResponse<AgentTaskItem> create(
            @Valid @RequestBody CreateTaskRequest request,
            Authentication authentication
    ) {
        long userId = currentUserId(authentication);
        return ApiResponse.success(agentTaskService.createAndSubmit(userId, request.instruction()));
    }

    @GetMapping("/tasks")
    public ApiResponse<List<AgentTaskItem>> list(Authentication authentication) {
        long userId = currentUserId(authentication);
        return ApiResponse.success(agentTaskService.listRecent(userId));
    }

    @GetMapping("/tasks/{id}")
    public ApiResponse<AgentTaskDetail> detail(@PathVariable("id") long taskId) {
        return ApiResponse.success(agentTaskService.getDetail(taskId));
    }

    @GetMapping("/tools")
    public ApiResponse<List<ToolInfo>> tools() {
        return ApiResponse.success(agentTaskService.listTools());
    }

    /**
     * SSE 端点：推送任务日志直到任务结束。
     *
     * 流程：
     * 1. 先把已落库的历史日志全部推给客户端（支持断线重连场景）。
     * 2. 如果任务已是终态，推送 done/error 事件后关闭。
     * 3. 否则订阅 EventBus，等待新日志并实时推送，直到收到终止哨兵。
     */
    @GetMapping(value = "/tasks/{id}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<StreamingResponseBody> stream(@PathVariable("id") long taskId) {
        StreamingResponseBody body = outputStream -> {
            BlockingQueue<AgentLogItem> queue = null;
            try (OutputStreamWriter writer = new OutputStreamWriter(outputStream, StandardCharsets.UTF_8)) {

                AgentTaskDetail detail = agentTaskService.getDetail(taskId);
                for (AgentLogItem log : detail.logs()) {
                    writeEvent(writer, "log", log);
                }

                AgentTaskStatus status = AgentTaskStatus.valueOf(detail.task().status());
                if (status.isTerminal()) {
                    if (status == AgentTaskStatus.DONE) {
                        writeEvent(writer, "done", new DonePayload(detail.task().output()));
                    } else {
                        writeEvent(writer, "error", new ErrorPayload(detail.task().errorMsg()));
                    }
                    writer.flush();
                    return;
                }

                queue = agentEventBus.subscribe(taskId);

                // 订阅后再次检查：防止订阅前任务刚好结束导致 publishTerminal 已经发出
                AgentTaskDetail recheckDetail = agentTaskService.getDetail(taskId);
                AgentTaskStatus recheckStatus = AgentTaskStatus.valueOf(recheckDetail.task().status());
                if (recheckStatus.isTerminal()) {
                    if (recheckStatus == AgentTaskStatus.DONE) {
                        writeEvent(writer, "done", new DonePayload(recheckDetail.task().output()));
                    } else {
                        writeEvent(writer, "error", new ErrorPayload(recheckDetail.task().errorMsg()));
                    }
                    writer.flush();
                    return;
                }

                // 最多等待 10 分钟（防止长时间持有线程）
                long deadline = System.currentTimeMillis() + TimeUnit.MINUTES.toMillis(10);
                while (System.currentTimeMillis() < deadline) {
                    AgentLogItem event;
                    try {
                        event = queue.poll(3, TimeUnit.SECONDS);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                    if (event == null) {
                        writer.write(": keepalive\n\n");
                        writer.flush();
                        continue;
                    }
                    if (event == AgentEventBus.TERMINAL) {
                        // 任务结束，推送 done/error
                        AgentTaskDetail finalDetail = agentTaskService.getDetail(taskId);
                        AgentTaskStatus finalStatus = AgentTaskStatus.valueOf(finalDetail.task().status());
                        if (finalStatus == AgentTaskStatus.DONE) {
                            writeEvent(writer, "done", new DonePayload(finalDetail.task().output()));
                        } else {
                            writeEvent(writer, "error", new ErrorPayload(finalDetail.task().errorMsg()));
                        }
                        writer.flush();
                        break;
                    }
                    writeEvent(writer, "log", event);
                    writer.flush();
                }
            } finally {
                if (queue != null) {
                    agentEventBus.unsubscribe(taskId, queue);
                }
            }
        };

        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_EVENT_STREAM)
                .body(body);
    }

    private void writeEvent(OutputStreamWriter writer, String eventType, Object payload) throws java.io.IOException {
        writer.write("event: " + eventType + "\n");
        writer.write("data: " + objectMapper.writeValueAsString(payload) + "\n\n");
    }

    private long currentUserId(Authentication authentication) {
        return userService.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalStateException("current user not found"))
                .getId();
    }

    record DonePayload(String output) {
    }

    record ErrorPayload(String message) {
    }
}
