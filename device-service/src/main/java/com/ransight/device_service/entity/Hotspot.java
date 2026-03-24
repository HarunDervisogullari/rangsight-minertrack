package com.ransight.device_service.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "hotspots")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Hotspot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String location;
    private String connectionStatus;
    private int level;
}
