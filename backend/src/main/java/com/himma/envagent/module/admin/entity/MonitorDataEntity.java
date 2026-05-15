package com.himma.envagent.module.admin.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("monitor_station_data")
public class MonitorDataEntity {

    @TableId(type = IdType.INPUT)
    private Long id;
    private String mn;
    private String paramCode;
    private String paramName;
    private Double measureValue;
    private LocalDateTime dataTime;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getMn() { return mn; }
    public void setMn(String mn) { this.mn = mn; }
    public String getParamCode() { return paramCode; }
    public void setParamCode(String paramCode) { this.paramCode = paramCode; }
    public String getParamName() { return paramName; }
    public void setParamName(String paramName) { this.paramName = paramName; }
    public Double getMeasureValue() { return measureValue; }
    public void setMeasureValue(Double measureValue) { this.measureValue = measureValue; }
    public LocalDateTime getDataTime() { return dataTime; }
    public void setDataTime(LocalDateTime dataTime) { this.dataTime = dataTime; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
