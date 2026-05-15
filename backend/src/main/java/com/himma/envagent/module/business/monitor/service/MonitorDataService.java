package com.himma.envagent.module.business.monitor.service;

import com.himma.envagent.common.exception.BusinessException;
import com.himma.envagent.module.auth.domain.UserRole;
import com.himma.envagent.module.business.monitor.entity.MonitorDataEntity;
import com.himma.envagent.module.business.monitor.repository.MonitorDataRepository;
import com.himma.envagent.module.business.monitor.vo.MonitorPayloads.MonitorDataItem;
import com.himma.envagent.module.business.monitor.vo.MonitorPayloads.MonitorDataRequest;
import com.himma.envagent.module.workspace.service.WorkspaceAccessService;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MonitorDataService {

    private final MonitorDataRepository monitorDataRepository;
    private final MonitorStationService monitorStationService;
    private final WorkspaceAccessService workspaceAccessService;

    public MonitorDataService(MonitorDataRepository monitorDataRepository,
                              MonitorStationService monitorStationService,
                              WorkspaceAccessService workspaceAccessService) {
        this.monitorDataRepository = monitorDataRepository;
        this.monitorStationService = monitorStationService;
        this.workspaceAccessService = workspaceAccessService;
    }

    public List<MonitorDataItem> list(Authentication authentication) {
        requireAdmin(authentication);
        return monitorDataRepository.findAll().stream().map(MonitorDataService::toItem).toList();
    }

    @Transactional
    public MonitorDataItem create(Authentication authentication, MonitorDataRequest request) {
        requireAdmin(authentication);
        validate(request);
        return toItem(monitorDataRepository.save(apply(new MonitorDataEntity(), request)));
    }

    @Transactional
    public MonitorDataItem update(Authentication authentication, Long id, MonitorDataRequest request) {
        requireAdmin(authentication);
        MonitorDataEntity entity = monitorDataRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "监测数据不存在"));
        validate(request);
        return toItem(monitorDataRepository.save(apply(entity, request)));
    }

    @Transactional
    public void delete(Authentication authentication, Long id) {
        requireAdmin(authentication);
        monitorDataRepository.deleteById(id);
    }

    private void requireAdmin(Authentication authentication) {
        workspaceAccessService.requireRoles(authentication, "监测数据", UserRole.ADMIN);
    }

    private void validate(MonitorDataRequest request) {
        monitorStationService.requireByMn(request.mn().trim());
        if (request.paramCode().isBlank() || request.paramName().isBlank()) {
            throw new BusinessException(400, "监测参数不能为空");
        }
    }

    private static MonitorDataEntity apply(MonitorDataEntity entity, MonitorDataRequest request) {
        entity.setMn(request.mn().trim());
        entity.setParamCode(request.paramCode().trim());
        entity.setParamName(request.paramName().trim());
        entity.setMeasureValue(request.value());
        entity.setDataTime(request.dataTime());
        entity.setUpdatedAt(LocalDateTime.now());
        return entity;
    }

    static MonitorDataItem toItem(MonitorDataEntity entity) {
        return new MonitorDataItem(
                entity.getId(),
                entity.getMn(),
                entity.getParamCode(),
                entity.getParamName(),
                entity.getMeasureValue(),
                entity.getDataTime(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
