package com.ransight.device_service.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ransight.device_service.entity.DeviceHotspot;
import com.ransight.device_service.entity.DeviceHotspotId;

public interface DeviceHotspotRepository extends JpaRepository<DeviceHotspot, DeviceHotspotId> {
    void deleteByDeviceIdAndHotspotId(Long deviceId, Long hotspotId);

    List<DeviceHotspot> findByHotspotId(Long id);
    List<DeviceHotspot> findByDeviceId(Long deviceId);
}
