package com.ransight.device_service.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ransight.device_service.entity.DeviceHotspot;
import com.ransight.device_service.entity.DeviceHotspotId;

public interface DeviceHotspotRepository extends JpaRepository<DeviceHotspot, DeviceHotspotId> {
    @Modifying
    @Query("DELETE FROM DeviceHotspot dh WHERE dh.device.id = :deviceId AND dh.hotspot.id = :hotspotId")
    void deleteByDeviceIdAndHotspotId(@Param("deviceId") Long deviceId, @Param("hotspotId") Long hotspotId);
    
    @Modifying
    @Query("DELETE FROM DeviceHotspot dh WHERE dh.hotspot.id = :hotspotId")
    void deleteByHotspotId(@Param("hotspotId") Long hotspotId);

    @Modifying
    @Query("DELETE FROM DeviceHotspot dh WHERE dh.device.id = :deviceId")
    void deleteByDeviceId(@Param("deviceId") Long deviceId);

    List<DeviceHotspot> findByHotspotId(Long id);
    List<DeviceHotspot> findByDeviceId(Long deviceId);
}
