package com.himma.envagent.module.admin.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("monitor_stations")
public class MonitorStationEntity {

    @TableId(type = IdType.INPUT)
    private Long id;
    private String stationId;
    private String mn;
    private Double lat;
    private Double lng;
    private String mnName;
    private Integer st;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getStationId() { return stationId; }
    public void setStationId(String stationId) { this.stationId = stationId; }
    public String getMn() { return mn; }
    public void setMn(String mn) { this.mn = mn; }
    public Double getLat() { return lat; }
    public void setLat(Double lat) { this.lat = lat; }
    public Double getLng() { return lng; }
    public void setLng(Double lng) { this.lng = lng; }
    public String getMnName() { return mnName; }
    public void setMnName(String mnName) { this.mnName = mnName; }
    public Integer getSt() { return st; }
    public void setSt(Integer st) { this.st = st; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
