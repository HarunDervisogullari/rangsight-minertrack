package com.ransight.gallery_service.controller;

import com.ransight.gallery_service.dto.GalleryRequest;
import com.ransight.gallery_service.model.Gallery;
import com.ransight.gallery_service.service.GalleryService;
import com.ransight.gallery_service.repository.*;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/galleries")
@CrossOrigin(origins = "*") // Allow frontend to connect
public class GalleryController {

    private final GalleryService galleryService;

    @Autowired
    private GalleryRepository galleryRepository;

    @Autowired
    private RestTemplate restTemplate;


    public GalleryController(GalleryService galleryService) {
        this.galleryService = galleryService;
    }

    @GetMapping
    public List<Gallery> getAllGalleries() {
        return galleryService.getAllGalleries();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Gallery> getGalleryById(@PathVariable Long id) {
        return galleryService.getGalleryById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Gallery createGallery(@RequestBody GalleryRequest galleryRequest) {
        Gallery gallery = new Gallery();
        gallery.setName(galleryRequest.getName());
        gallery.setLocation(galleryRequest.getLocation());
        gallery.setLevel(galleryRequest.getLevel());
        gallery.setCapacity(galleryRequest.getCapacity()); // ✅ Set capacity
        return galleryRepository.save(gallery);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Gallery> updateGallery(@PathVariable Long id, @RequestBody GalleryRequest galleryRequest) {
        return galleryRepository.findById(id)
            .map(gallery -> {
                gallery.setName(galleryRequest.getName());
                gallery.setLocation(galleryRequest.getLocation());
                gallery.setLevel(galleryRequest.getLevel());
                gallery.setCapacity(galleryRequest.getCapacity()); // ✅ Update capacity
                Gallery updatedGallery = galleryRepository.save(gallery);
                return ResponseEntity.ok(updatedGallery);
            })
            .orElse(ResponseEntity.notFound().build());
    }
    @DeleteMapping("/{id}")
public ResponseEntity<?> deleteGallery(@PathVariable Long id) {
    // 1. Call device-service to unassign related entities
    try {
        restTemplate.delete("http://device-service:8082/api/devices/unassign-gallery/" + id);
    } catch (Exception e) {
        return ResponseEntity.status(500).body("Failed to unassign related devices/hotspots: " + e.getMessage());
    }

    // 2. Delete the gallery
    galleryRepository.deleteById(id);
    return ResponseEntity.ok("Gallery deleted successfully with related data unassigned.");
}



@PutMapping("/location/{location}")
public Gallery updateGalleryByLocation(@PathVariable String location, @RequestBody GalleryRequest request) {
    Gallery gallery = galleryRepository.findByLocation(location)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    gallery.setName(request.getName());
    gallery.setLevel(request.getLevel());
    gallery.setCapacity(request.getCapacity()); // new
    return galleryRepository.save(gallery);
}

@PutMapping("/rename/{id}")
public ResponseEntity<?> renameGallery(@PathVariable Long id, @RequestBody Map<String, String> request) {
    Gallery gallery = galleryRepository.findById(id).orElseThrow();
    String newName = request.get("name");

    String oldName = gallery.getName();
    gallery.setName(newName);
    galleryRepository.save(gallery);

    // Notify device-service
    Map<String, String> payload = new HashMap<>();
    payload.put("oldName", oldName);
    payload.put("newName", newName);

    try {
        restTemplate.put("http://device-service:8082/api/devices/update-gallery-name", payload);
    } catch (Exception e) {
        return ResponseEntity.status(500).body("Failed to update related data: " + e.getMessage());
    }

    return ResponseEntity.ok("Gallery renamed successfully and related data updated.");
}


    @DeleteMapping("/location/{location}")
    public ResponseEntity<Void> deleteByLocation(@PathVariable String location) {
        Optional<Gallery> gallery = galleryService.getAllGalleries().stream()
                .filter(g -> g.getLocation().equals(location))
                .findFirst();
        if (gallery.isPresent()) {
            galleryService.deleteGallery(gallery.get().getId());
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/location/{location}")
public Long getGalleryIdByLocation(@PathVariable String location) {
    Gallery gallery = galleryRepository.findByLocation(location)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Gallery not found"));
    return gallery.getId();
}

@GetMapping("/name/{name}")
public ResponseEntity<Gallery> getGalleryByName(@PathVariable String name) {
    Optional<Gallery> gallery = galleryRepository.findByName(name);
    return gallery.map(ResponseEntity::ok)
                  .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Gallery not found"));
}



}
