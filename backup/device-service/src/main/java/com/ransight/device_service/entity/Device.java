package com.ransight.device_service.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "devices")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Device {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Boolean isOn;
    private String label;
    private String owned;
    private String type;
    private String barcode;
}
