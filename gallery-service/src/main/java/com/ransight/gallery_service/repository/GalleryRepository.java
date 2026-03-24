package com.ransight.gallery_service.repository;

import com.ransight.gallery_service.model.Gallery;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface GalleryRepository extends JpaRepository<Gallery, Long> {

    // Example of valid methods:
    boolean existsByName(String name); // VALID - name column exists
    boolean existsByLocation(String location); // VALID - location column exists
    Optional<Gallery> findByLocation(String location);
    Optional<Gallery> findByName(String name);

    // ❌ REMOVE THIS - Invalid field
    // boolean existsByZoneId(String zoneId); 
}
