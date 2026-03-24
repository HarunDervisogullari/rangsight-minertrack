package com.ransight.device_service.entity;

import java.io.Serializable;
import java.util.Objects;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class DeviceHotspotId implements Serializable {

    @Column(name = "device_id")
    private Long deviceId;

    @Column(name = "hotspot_id")
    private Long hotspotId;

    // Default constructor
    public DeviceHotspotId() {}

    // Constructor with parameters
    public DeviceHotspotId(Long deviceId, Long hotspotId) {
        this.deviceId = deviceId;
        this.hotspotId = hotspotId;
    }

    // Getters and Setters
    public Long getDeviceId() {
        return deviceId;
    }

    public void setDeviceId(Long deviceId) {
        this.deviceId = deviceId;
    }

    public Long getHotspotId() {
        return hotspotId;
    }

    public void setHotspotId(Long hotspotId) {
        this.hotspotId = hotspotId;
    }

    // equals and hashCode
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof DeviceHotspotId)) return false;
        DeviceHotspotId that = (DeviceHotspotId) o;
        return Objects.equals(deviceId, that.deviceId) &&
               Objects.equals(hotspotId, that.hotspotId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(deviceId, hotspotId);
    }
}
