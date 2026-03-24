package com.ransight.device_service.controller;

import com.ransight.device_service.entity.Hotspot;
import com.ransight.device_service.repository.HotspotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hotspots")
@RequiredArgsConstructor
public class HotspotController {

    private final HotspotRepository hotspotRepository;

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
    public void deleteHotspot(@PathVariable Long id) {
        hotspotRepository.deleteById(id);
    }
}
