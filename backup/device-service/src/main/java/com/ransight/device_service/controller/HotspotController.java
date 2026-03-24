package com.ransight.device_service.controller;

import com.ransight.device_service.entity.Hotspot;
import com.ransight.device_service.repository.HotspotRepository;
import com.ransight.device_service.repository.HotspotGalleryRepository;
import com.ransight.device_service.repository.DeviceHotspotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.util.List;

@RestController
@RequestMapping("/api/hotspots")
@RequiredArgsConstructor
public class HotspotController {

    private final HotspotRepository hotspotRepository;
    private final HotspotGalleryRepository hotspotGalleryRepository;
    private final DeviceHotspotRepository deviceHotspotRepository;
    
    @PersistenceContext
    private EntityManager entityManager;

    @GetMapping
    public List<Hotspot> getAllHotspots() {
        return hotspotRepository.findAll();
    }

    @PostMapping
    public Hotspot createHotspot(@RequestBody Hotspot hotspot) {
        return hotspotRepository.save(hotspot);
    }

    @GetMapping("/{id}")
    public Hotspot getHotspotById(@PathVariable Long id) {
        return hotspotRepository.findById(id).orElseThrow();
    }

    @PutMapping("/{id}")
    public Hotspot updateHotspot(@PathVariable Long id, @RequestBody Hotspot updated) {
        Hotspot hotspot = hotspotRepository.findById(id).orElseThrow();
        hotspot.setLocation(updated.getLocation());
        hotspot.setConnectionStatus(updated.getConnectionStatus());
        hotspot.setLevel(updated.getLevel());
        return hotspotRepository.save(hotspot);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteHotspot(@PathVariable Long id) {
        try {
            deleteHotspotWithCleanup(id);
            return ResponseEntity.ok().body("Hotspot deleted successfully");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error deleting hotspot: " + e.getMessage());
        }
    }
    
    @Transactional
    public void deleteHotspotWithCleanup(Long id) {
        // Check if hotspot exists
        if (!hotspotRepository.existsById(id)) {
            throw new RuntimeException("Hotspot not found with id: " + id);
        }
        
        try {
            // 1. Delete from hotspot_gallery junction table first
            int galleryDeleted = entityManager.createNativeQuery("DELETE FROM hotspot_gallery WHERE hotspot_id = :hotspotId")
                    .setParameter("hotspotId", id)
                    .executeUpdate();
            System.out.println("Deleted " + galleryDeleted + " hotspot_gallery records");
            
            // 2. Delete from device_hotspot junction table
            int deviceHotspotDeleted = entityManager.createNativeQuery("DELETE FROM device_hotspot WHERE hotspot_id = :hotspotId")
                    .setParameter("hotspotId", id)
                    .executeUpdate();
            System.out.println("Deleted " + deviceHotspotDeleted + " device_hotspot records");
            
            // Force flush to ensure SQL is executed
            entityManager.flush();
            
            // 3. Now safe to delete the hotspot itself
            hotspotRepository.deleteById(id);
            entityManager.flush();
            
            System.out.println("Successfully deleted hotspot with id: " + id);
        } catch (Exception e) {
            System.err.println("Error during hotspot deletion: " + e.getMessage());
            throw e;
        }
    }
}
