package com.ransight.device_service.repository;

import com.ransight.device_service.entity.HotspotGallery;
import com.ransight.device_service.entity.HotspotGalleryId;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface HotspotGalleryRepository extends JpaRepository<HotspotGallery, HotspotGalleryId> {
    void deleteByHotspotId(Long hotspotId);

    boolean existsById(HotspotGalleryId hotspotGalleryId);

    List<HotspotGallery> findByGalleryId(Long galleryId);
}
