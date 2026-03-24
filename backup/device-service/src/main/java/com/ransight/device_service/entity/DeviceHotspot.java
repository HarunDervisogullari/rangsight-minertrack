package com.ransight.device_service.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "device_hotspot")
public class DeviceHotspot {

    @EmbeddedId
    private DeviceHotspotId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("deviceId")
    @JoinColumn(name = "device_id")
    private Device device;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("hotspotId")
    @JoinColumn(name = "hotspot_id")
    private Hotspot hotspot;

    @Column(name = "connected_at")
    private LocalDateTime connectedAt;

    @Column(name = "disconnected_at")
    private LocalDateTime disconnectedAt;

    // Getters and Setters

    public DeviceHotspotId getId() {
        return id;
    }

    public void setId(DeviceHotspotId id) {
        this.id = id;
    }

    public Device getDevice() {
        return device;
    }

    public void setDevice(Device device) {
        this.device = device;
    }

    public Hotspot getHotspot() {
        return hotspot;
    }

    public void setHotspot(Hotspot hotspot) {
        this.hotspot = hotspot;
    }

    public LocalDateTime getConnectedAt() {
        return connectedAt;
    }

    public void setConnectedAt(LocalDateTime connectedAt) {
        this.connectedAt = connectedAt;
    }

    public LocalDateTime getDisconnectedAt() {
        return disconnectedAt;
    }

    public void setDisconnectedAt(LocalDateTime disconnectedAt) {
        this.disconnectedAt = disconnectedAt;
    }
}
