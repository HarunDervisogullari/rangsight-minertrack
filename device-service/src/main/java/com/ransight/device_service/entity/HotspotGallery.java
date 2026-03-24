package com.ransight.device_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "hotspot_gallery")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class HotspotGallery {

    @EmbeddedId
    private HotspotGalleryId id;

    @ManyToOne
    @MapsId("hotspotId")
    @JoinColumn(name = "hotspot_id")
    private Hotspot hotspot;

    @Column(name = "gallery_id", insertable = false, updatable = false)
    private Long galleryId;

    private LocalDateTime assignedAt;
}
