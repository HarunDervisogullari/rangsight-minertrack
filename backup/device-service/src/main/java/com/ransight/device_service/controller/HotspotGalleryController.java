package com.ransight.device_service.controller;

import com.ransight.device_service.entity.HotspotGallery;
import com.ransight.device_service.repository.HotspotGalleryRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
@RestController
@RequestMapping("/hotspot-gallery")
public class HotspotGalleryController {

    private final HotspotGalleryRepository hotspotGalleryRepository;

    public HotspotGalleryController(HotspotGalleryRepository hotspotGalleryRepository) {
        this.hotspotGalleryRepository = hotspotGalleryRepository;
    }

    @PostMapping
    public ResponseEntity<HotspotGallery> assignHotspotToGallery(@RequestBody HotspotGallery assignment) {
        assignment.setAssignedAt(LocalDateTime.now());
        return ResponseEntity.ok(hotspotGalleryRepository.save(assignment));
    }
}