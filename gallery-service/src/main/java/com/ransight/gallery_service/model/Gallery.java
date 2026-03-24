package com.ransight.gallery_service.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "galleries")
@Data
public class Gallery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 100)
    private String name;

    @Column(length = 100)
    private String location;

    private Integer workerCount;
    private Integer hotspotCount;

    private Double oxygen;
    private Double co2;
    private Double otherGas;

    private Integer level;

    @Column(name = "capacity")
    private Integer capacity;

    public Integer getCapacity() {
        return capacity;
    }

    public void setCapacity(Integer capacity) {
        this.capacity = capacity;
    }
}
