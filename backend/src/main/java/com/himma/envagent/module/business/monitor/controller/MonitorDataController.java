package com.himma.envagent.module.business.monitor.controller;

import com.himma.envagent.common.api.ApiResponse;
import com.himma.envagent.module.business.monitor.service.MonitorDataService;
import com.himma.envagent.module.business.monitor.service.MonitorSimulationService;
import com.himma.envagent.module.business.monitor.vo.MonitorPayloads.MonitorDataItem;
import com.himma.envagent.module.business.monitor.vo.MonitorPayloads.MonitorDataRangeRequest;
import com.himma.envagent.module.business.monitor.vo.MonitorPayloads.MonitorDataRequest;
import com.himma.envagent.module.business.monitor.vo.MonitorPayloads.MonitorDataSimulateRequest;
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
@RequestMapping("/api/v1/business/monitor-data")
public class MonitorDataController {

    private final MonitorDataService monitorDataService;
    private final MonitorSimulationService simulationService;

    public MonitorDataController(MonitorDataService monitorDataService, MonitorSimulationService simulationService) {
        this.monitorDataService = monitorDataService;
        this.simulationService = simulationService;
    }

    @GetMapping
    public ApiResponse<List<MonitorDataItem>> list(Authentication authentication) {
        return ApiResponse.success(monitorDataService.list(authentication));
    }

    @PostMapping
    public ApiResponse<MonitorDataItem> create(Authentication authentication, @Valid @RequestBody MonitorDataRequest request) {
        return ApiResponse.success(monitorDataService.create(authentication, request));
    }

    @PutMapping("/{id}")
    public ApiResponse<MonitorDataItem> update(Authentication authentication, @PathVariable Long id,
                                               @Valid @RequestBody MonitorDataRequest request) {
        return ApiResponse.success(monitorDataService.update(authentication, id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(Authentication authentication, @PathVariable Long id) {
        monitorDataService.delete(authentication, id);
        return ApiResponse.success(null);
    }

    @GetMapping("/params")
    public ApiResponse<List<MonitorDataRangeRequest>> params(Authentication authentication) {
        return ApiResponse.success(simulationService.listParamTemplates(authentication));
    }

    @PostMapping("/simulate")
    public ApiResponse<List<MonitorDataItem>> simulate(Authentication authentication,
                                                       @Valid @RequestBody MonitorDataSimulateRequest request) {
        return ApiResponse.success(simulationService.simulate(authentication, request));
    }
}
