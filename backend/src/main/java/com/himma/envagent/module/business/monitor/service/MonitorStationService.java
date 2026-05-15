package com.himma.envagent.module.business.monitor.service;

import com.himma.envagent.common.exception.BusinessException;
import com.himma.envagent.module.auth.domain.UserRole;
import com.himma.envagent.module.business.monitor.entity.MonitorStationEntity;
import com.himma.envagent.module.business.monitor.repository.MonitorStationRepository;
import com.himma.envagent.module.business.monitor.vo.MonitorPayloads.StationItem;
import com.himma.envagent.module.business.monitor.vo.MonitorPayloads.StationRequest;
import com.himma.envagent.module.workspace.service.WorkspaceAccessService;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MonitorStationService {

    private final MonitorStationRepository stationRepository;
    private final WorkspaceAccessService workspaceAccessService;

    public MonitorStationService(MonitorStationRepository stationRepository,
                                 WorkspaceAccessService workspaceAccessService) {
        this.stationRepository = stationRepository;
        this.workspaceAccessService = workspaceAccessService;
    }

    public List<StationItem> list(Authentication authentication) {
        requireAdmin(authentication);
        return stationRepository.findAll().stream().map(MonitorStationService::toItem).toList();
    }

    @Transactional
    public StationItem create(Authentication authentication, StationRequest request) {
        requireAdmin(authentication);
        validateUniqueness(request, null);
        return toItem(stationRepository.save(apply(new MonitorStationEntity(), request)));
    }

    @Transactional
    public StationItem update(Authentication authentication, Long id, StationRequest request) {
        requireAdmin(authentication);
        MonitorStationEntity entity = stationRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "站点不存在"));
        validateUniqueness(request, id);
        return toItem(stationRepository.save(apply(entity, request)));
    }

    @Transactional
    public void delete(Authentication authentication, Long id) {
        requireAdmin(authentication);
        stationRepository.deleteById(id);
    }

    /** 校验「站点 MN 是否在站点表里」——外部模块（如 simulate）使用。 */
    public MonitorStationEntity requireByMn(String mn) {
        return stationRepository.findByMn(mn)
                .orElseThrow(() -> new BusinessException(400, "未找到对应站点 MN"));
    }

    public List<MonitorStationEntity> findAll() {
        return stationRepository.findAll();
    }

    public void ensureDefaultStations() {
        ensureStation("TH-WX-001", "320200A001", 31.4382, 120.2096, "太湖梅梁湖心", 21);
        ensureStation("TH-WX-002", "320200A002", 31.3745, 120.1688, "太湖北部湖心", 21);
        ensureStation("TH-WX-003", "320200A003", 31.2874, 120.2203, "太湖贡湖湾口", 21);
        ensureStation("TH-WX-004", "320200A004", 31.2258, 120.1107, "太湖拖山近岸", 21);
    }

    private void ensureStation(String stationId, String mn, double lat, double lng, String mnName, int st) {
        MonitorStationEntity entity = stationRepository.findByStationId(stationId).orElseGet(MonitorStationEntity::new);
        entity.setStationId(stationId);
        entity.setMn(mn);
        entity.setLat(lat);
        entity.setLng(lng);
        entity.setMnName(mnName);
        entity.setSt(st);
        entity.setUpdatedAt(LocalDateTime.now());
        stationRepository.save(entity);
    }

    private void requireAdmin(Authentication authentication) {
        workspaceAccessService.requireRoles(authentication, "监测站点", UserRole.ADMIN);
    }

    private void validateUniqueness(StationRequest request, Long currentId) {
        stationRepository.findByStationId(request.stationId().trim())
                .filter(item -> currentId == null || !item.getId().equals(currentId))
                .ifPresent(item -> { throw new BusinessException(409, "站点编码已存在"); });
        stationRepository.findByMn(request.mn().trim())
                .filter(item -> currentId == null || !item.getId().equals(currentId))
                .ifPresent(item -> { throw new BusinessException(409, "MN 编号已存在"); });
    }

    private static MonitorStationEntity apply(MonitorStationEntity entity, StationRequest request) {
        entity.setStationId(request.stationId().trim());
        entity.setMn(request.mn().trim());
        entity.setLat(request.lat());
        entity.setLng(request.lng());
        entity.setMnName(request.mnName().trim());
        entity.setSt(request.st());
        entity.setUpdatedAt(LocalDateTime.now());
        return entity;
    }

    private static StationItem toItem(MonitorStationEntity entity) {
        return new StationItem(
                entity.getId(),
                entity.getStationId(),
                entity.getMn(),
                entity.getLat(),
                entity.getLng(),
                entity.getMnName(),
                entity.getSt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
