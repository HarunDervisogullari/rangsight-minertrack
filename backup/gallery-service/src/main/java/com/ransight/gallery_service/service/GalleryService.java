package com.ransight.gallery_service.service;

import com.ransight.gallery_service.dto.GalleryRequest;
import com.ransight.gallery_service.model.Gallery;
import com.ransight.gallery_service.repository.GalleryRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class GalleryService {

    private final GalleryRepository galleryRepository;

    public GalleryService(GalleryRepository galleryRepository) {
        this.galleryRepository = galleryRepository;
    }

    public List<Gallery> getAllGalleries() {
        return galleryRepository.findAll();
    }

    public Optional<Gallery> getGalleryById(Long id) {
        return galleryRepository.findById(id);
    }

    public Gallery createGallery(GalleryRequest galleryRequest) {
        Gallery gallery = new Gallery();
        gallery.setName(galleryRequest.getName());
        gallery.setLocation(galleryRequest.getLocation());
        gallery.setLevel(galleryRequest.getLevel());
        // Other fields default to null/zero
        return galleryRepository.save(gallery);
    }

    public Gallery updateGallery(Long id, GalleryRequest updatedGallery) {
        return galleryRepository.findById(id).map(g -> {
            g.setName(updatedGallery.getName());
            g.setLocation(updatedGallery.getLocation());
            g.setLevel(updatedGallery.getLevel());
            return galleryRepository.save(g);
        }).orElseThrow(() -> new RuntimeException("Gallery not found"));
    }

    public void deleteGallery(Long id) {
        galleryRepository.deleteById(id);
    }

    public void deleteGalleryByLocation(String location) {
        galleryRepository.findByLocation(location).ifPresent(galleryRepository::delete);
    }
}
