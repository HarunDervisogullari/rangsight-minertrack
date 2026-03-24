package com.ransight.device_service.repository;

import com.ransight.device_service.entity.Hotspot;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface HotspotRepository extends JpaRepository<Hotspot, Long> {
    List<Hotspot> findByLocation(String location);
}

