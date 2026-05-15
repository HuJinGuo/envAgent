package com.himma.envagent.module.business.monitor.vo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;

public final class MonitorPayloads {

    private MonitorPayloads() {
    }

    public record StationItem(Long id, String stationId, String mn, Double lat, Double lng, String mnName,
                              Integer st, LocalDateTime createdAt, LocalDateTime updatedAt) {
    }

    public record StationRequest(@NotBlank String stationId, @NotBlank String mn, @NotNull Double lat,
                                 @NotNull Double lng, @NotBlank String mnName, @NotNull Integer st) {
    }

    public record MonitorDataItem(Long id, String mn, String paramCode, String paramName, Double value,
                                  LocalDateTime dataTime, LocalDateTime createdAt, LocalDateTime updatedAt) {
    }

    public record MonitorDataRequest(@NotBlank String mn, @NotBlank String paramCode, @NotBlank String paramName,
                                     @NotNull Double value, @NotNull LocalDateTime dataTime) {
    }

    public record MonitorDataRangeRequest(@NotBlank String paramCode, @NotBlank String paramName, @NotNull Double minValue,
                                          @NotNull Double maxValue) {
    }

    public record MonitorDataSimulateRequest(@NotBlank String mn, @NotNull LocalDateTime dataTime,
                                             @NotNull List<MonitorDataRangeRequest> ranges) {
    }
}
