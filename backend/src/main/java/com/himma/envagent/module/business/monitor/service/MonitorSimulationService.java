package com.himma.envagent.module.business.monitor.service;

import com.himma.envagent.common.exception.BusinessException;
import com.himma.envagent.module.auth.domain.UserRole;
import com.himma.envagent.module.business.monitor.entity.MonitorDataEntity;
import com.himma.envagent.module.business.monitor.entity.MonitorStationEntity;
import com.himma.envagent.module.business.monitor.repository.MonitorDataRepository;
import com.himma.envagent.module.business.monitor.vo.MonitorPayloads.MonitorDataItem;
import com.himma.envagent.module.business.monitor.vo.MonitorPayloads.MonitorDataRangeRequest;
import com.himma.envagent.module.business.monitor.vo.MonitorPayloads.MonitorDataSimulateRequest;
import com.himma.envagent.module.workspace.service.WorkspaceAccessService;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 监测数据模拟生成：用于初始化样例数据 + 提供 API 端点按时间点和浓度范围批量生成监测值。
 */
@Service
public class MonitorSimulationService {

    public static final List<MonitorDataRangeRequest> DEFAULT_PARAMS = List.of(
            new MonitorDataRangeRequest("TN", "总氮", 1.2, 2.4),
            new MonitorDataRangeRequest("TP", "总磷", 0.03, 0.18),
            new MonitorDataRangeRequest("NH3N", "氨氮", 0.08, 0.9),
            new MonitorDataRangeRequest("PH", "ph", 6.8, 8.2),
            new MonitorDataRangeRequest("CODMN", "高猛", 2.0, 6.5),
            new MonitorDataRangeRequest("WL", "水位", 2.5, 4.6),
            new MonitorDataRangeRequest("VS", "流速", 0.05, 0.8),
            new MonitorDataRangeRequest("Q", "流量", 15.0, 180.0)
    );

    private final MonitorDataRepository monitorDataRepository;
    private final MonitorStationService monitorStationService;
    private final WorkspaceAccessService workspaceAccessService;

    public MonitorSimulationService(MonitorDataRepository monitorDataRepository,
                                    MonitorStationService monitorStationService,
                                    WorkspaceAccessService workspaceAccessService) {
        this.monitorDataRepository = monitorDataRepository;
        this.monitorStationService = monitorStationService;
        this.workspaceAccessService = workspaceAccessService;
    }

    public List<MonitorDataRangeRequest> listParamTemplates(Authentication authentication) {
        workspaceAccessService.requireRoles(authentication, "监测参数模板", UserRole.ADMIN);
        return DEFAULT_PARAMS;
    }

    @Transactional
    public List<MonitorDataItem> simulate(Authentication authentication, MonitorDataSimulateRequest request) {
        workspaceAccessService.requireRoles(authentication, "监测数据模拟", UserRole.ADMIN);
        if (request.ranges() == null || request.ranges().isEmpty()) {
            throw new BusinessException(400, "至少需要配置一个监测参数范围");
        }
        String targetMn = request.mn().trim();
        List<MonitorDataRangeRequest> ranges = request.ranges().stream()
                .sorted(Comparator.comparing(MonitorDataRangeRequest::paramCode))
                .toList();
        for (MonitorDataRangeRequest range : ranges) {
            validateRange(range);
        }
        List<String> targetMns;
        if ("ALL".equalsIgnoreCase(targetMn)) {
            targetMns = monitorStationService.findAll().stream()
                    .map(MonitorStationEntity::getMn)
                    .sorted()
                    .toList();
            if (targetMns.isEmpty()) {
                throw new BusinessException(400, "当前暂无可用站点，无法模拟全部站点数据");
            }
        } else {
            monitorStationService.requireByMn(targetMn);
            targetMns = List.of(targetMn);
        }

        List<MonitorDataItem> generated = new ArrayList<>();
        for (String mn : targetMns) {
            monitorDataRepository.deleteByMnAndTime(mn, request.dataTime());
            for (MonitorDataRangeRequest range : ranges) {
                MonitorDataEntity entity = new MonitorDataEntity();
                entity.setMn(mn);
                entity.setParamCode(range.paramCode().trim());
                entity.setParamName(range.paramName().trim());
                entity.setMeasureValue(randomValue(range.minValue(), range.maxValue()));
                entity.setDataTime(request.dataTime());
                entity.setUpdatedAt(LocalDateTime.now());
                generated.add(MonitorDataService.toItem(monitorDataRepository.save(entity)));
            }
        }
        return generated;
    }

    /** 初始化样例：每个站点按当前整点 + 默认参数范围生成一组数据，仅在表为空时执行。 */
    public void seedSampleDataIfEmpty() {
        if (monitorDataRepository.hasAny()) {
            return;
        }
        LocalDateTime sampleTime = LocalDateTime.now().withMinute(0).withSecond(0).withNano(0);
        for (MonitorStationEntity station : monitorStationService.findAll()) {
            monitorDataRepository.deleteByMnAndTime(station.getMn(), sampleTime);
            for (MonitorDataRangeRequest range : DEFAULT_PARAMS) {
                MonitorDataEntity entity = new MonitorDataEntity();
                entity.setMn(station.getMn());
                entity.setParamCode(range.paramCode());
                entity.setParamName(range.paramName());
                entity.setMeasureValue(randomValue(range.minValue(), range.maxValue()));
                entity.setDataTime(sampleTime);
                entity.setUpdatedAt(LocalDateTime.now());
                monitorDataRepository.save(entity);
            }
        }
    }

    private void validateRange(MonitorDataRangeRequest range) {
        if (range.minValue() > range.maxValue()) {
            throw new BusinessException(400, range.paramName() + " 的最小值不能大于最大值");
        }
    }

    private double randomValue(double minValue, double maxValue) {
        double value = minValue + (maxValue - minValue) * ThreadLocalRandom.current().nextDouble();
        return Math.round(value * 1000D) / 1000D;
    }
}
