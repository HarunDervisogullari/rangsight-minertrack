package com.ransight.device_service.repository;

import com.ransight.device_service.entity.HotspotGallery;
import com.ransight.device_service.entity.HotspotGalleryId;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface HotspotGalleryRepository extends JpaRepository<HotspotGallery, HotspotGalleryId> {
    @Modifying
    @Query("DELETE FROM HotspotGallery hg WHERE hg.hotspot.id = :hotspotId")
    void deleteByHotspotId(@Param("hotspotId") Long hotspotId);

    boolean existsById(HotspotGalleryId hotspotGalleryId);

    List<HotspotGallery> findByGalleryId(Long galleryId);
}
