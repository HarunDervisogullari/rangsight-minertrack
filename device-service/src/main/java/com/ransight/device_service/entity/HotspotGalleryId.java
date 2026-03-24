package com.ransight.device_service.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

@Embeddable
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @EqualsAndHashCode
public class HotspotGalleryId implements Serializable {

    @Column(name = "hotspot_id")
    private Long hotspotId;

    @Column(name = "gallery_id")
    private Long galleryId;
}
