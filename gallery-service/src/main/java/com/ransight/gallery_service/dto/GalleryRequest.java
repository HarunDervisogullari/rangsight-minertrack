package com.ransight.gallery_service.dto;

import lombok.Data;

@Data
public class GalleryRequest {
    private String name;
    private String location;
    private Integer level;
    private Integer capacity;
    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }
}
