package com.himma.envagent.module.business.monitor.controller;

import com.himma.envagent.common.api.ApiResponse;
import com.himma.envagent.module.business.monitor.service.MonitorStationService;
import com.himma.envagent.module.business.monitor.vo.MonitorPayloads.StationItem;
import com.himma.envagent.module.business.monitor.vo.MonitorPayloads.StationRequest;
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
@RequestMapping("/api/v1/business/stations")
public class MonitorStationController {

    private final MonitorStationService stationService;

    public MonitorStationController(MonitorStationService stationService) {
        this.stationService = stationService;
    }

    @GetMapping
    public ApiResponse<List<StationItem>> list(Authentication authentication) {
        return ApiResponse.success(stationService.list(authentication));
    }

    @PostMapping
    public ApiResponse<StationItem> create(Authentication authentication, @Valid @RequestBody StationRequest request) {
        return ApiResponse.success(stationService.create(authentication, request));
    }

    @PutMapping("/{id}")
    public ApiResponse<StationItem> update(Authentication authentication, @PathVariable Long id,
                                           @Valid @RequestBody StationRequest request) {
        return ApiResponse.success(stationService.update(authentication, id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(Authentication authentication, @PathVariable Long id) {
        stationService.delete(authentication, id);
        return ApiResponse.success(null);
    }
}
