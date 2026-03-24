package com.ransight.device_service.controller;

import com.ransight.device_service.entity.Device;
import com.ransight.device_service.entity.DeviceHotspot;
import com.ransight.device_service.entity.DeviceHotspotId;
import com.ransight.device_service.entity.Hotspot;
import com.ransight.device_service.entity.HotspotGallery;
import com.ransight.device_service.entity.HotspotGalleryId;
import com.ransight.device_service.repository.DeviceHotspotRepository;
import com.ransight.device_service.repository.DeviceRepository;
import com.ransight.device_service.repository.HotspotRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.NoResultException;
import jakarta.transaction.Transactional;

import com.ransight.device_service.repository.HotspotGalleryRepository;
import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/api/devices")
@RequiredArgsConstructor
public class DeviceController {


    @Autowired
    private RestTemplate restTemplate;
    
    private final DeviceRepository deviceRepository;
    private final HotspotRepository hotspotRepository;
    private final HotspotGalleryRepository hotspotGalleryRepository;
    private final DeviceHotspotRepository deviceHotspotRepository;
    
    
    @PostMapping
    @Transactional
    public Device createDevice(@RequestBody Device device) {
        Device savedDevice = deviceRepository.save(device);
    
        if ("Hotspot".equalsIgnoreCase(device.getType()) && !"Unassigned".equalsIgnoreCase(device.getOwned())) {
            String normalizedLocation = device.getOwned().trim().toLowerCase();
    
            // Check for existing hotspot strictly by normalized location
            Hotspot hotspot = hotspotRepository.findAll().stream()
                .filter(h -> h.getLocation().trim().equalsIgnoreCase(normalizedLocation))
                .findFirst()
                .orElse(null);
    
            if (hotspot == null) {
                hotspot = new Hotspot();
                hotspot.setLocation(device.getOwned().trim());
                hotspot.setConnectionStatus("disconnected");
                hotspot.setLevel(0);
                hotspot = hotspotRepository.save(hotspot);
            }
    
            // Get gallery ID properly (still backend responsibility)
            Long galleryId = fetchGalleryId(device.getOwned());
    
            HotspotGalleryId hgId = new HotspotGalleryId(hotspot.getId(), galleryId);
            if (!hotspotGalleryRepository.existsById(hgId)) {
                HotspotGallery hotspotGallery = HotspotGallery.builder()
                    .id(hgId)
                    .hotspot(hotspot)
                    .galleryId(galleryId)
                    .assignedAt(LocalDateTime.now())
                    .build();
                hotspotGalleryRepository.save(hotspotGallery);
            }
    
            DeviceHotspotId dhId = new DeviceHotspotId(savedDevice.getId(), hotspot.getId());
            if (!deviceHotspotRepository.existsById(dhId)) {
                DeviceHotspot deviceHotspot = new DeviceHotspot();
                deviceHotspot.setId(dhId);
                deviceHotspot.setDevice(savedDevice);
                deviceHotspot.setHotspot(hotspot);
                deviceHotspot.setConnectedAt(LocalDateTime.now());
                deviceHotspotRepository.save(deviceHotspot);
            }
        }
    
        return savedDevice;
    }
    
    
    private Long fetchGalleryId(String owned) {
        try {
            Map<String, Object> response = restTemplate.getForObject(
                "http://gallery-service:8081/api/galleries/name/" + owned, Map.class);
            return Long.valueOf(response.get("id").toString());
        } catch (Exception e) {
            try {
                Map<String, Object> response = restTemplate.getForObject(
                    "http://gallery-service:8081/api/galleries/location/" + owned, Map.class);
                return Long.valueOf(response.get("id").toString());
            } catch (Exception ex) {
                throw new RuntimeException("Gallery not found by name or location: " + owned);
            }
        }
    }
    
    
    
    @DeleteMapping("/detach-gallery/{deviceId}")
    public void detachGallery(@PathVariable Long deviceId) {
        Device device = deviceRepository.findById(deviceId).orElseThrow();
        if ("Hotspot".equalsIgnoreCase(device.getType())) {
            List<Hotspot> hotspots = hotspotRepository.findByLocation(device.getOwned());
            for (Hotspot hotspot : hotspots) {
                hotspotGalleryRepository.deleteByHotspotId(hotspot.getId());
                deviceHotspotRepository.deleteByDeviceIdAndHotspotId(deviceId, hotspot.getId());
            }
        }
    }
    @PostMapping("/hotspot-gallery/detach/{deviceId}")
    @Transactional
    public ResponseEntity<?> detachHotspotFromGallery(@PathVariable Long deviceId) {
        Device device = deviceRepository.findById(deviceId).orElseThrow();
    
        if ("Hotspot".equalsIgnoreCase(device.getType())) {
            List<Hotspot> hotspots = hotspotRepository.findByLocation(device.getOwned());
            for (Hotspot hotspot : hotspots) {
                // 1. Delete only from hotspot_gallery
                hotspotGalleryRepository.deleteByHotspotId(hotspot.getId());
    
                // 2. Set Hotspot's location as Unassigned
                hotspot.setLocation("Unassigned");
                hotspotRepository.save(hotspot);
            }
    
            // 3. Update the device's owned field
            device.setOwned("Unassigned");
            deviceRepository.save(device);
    
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.badRequest().body("Device is not a Hotspot.");
    }
    
    @PutMapping("/hotspots/update-location/{deviceId}")
@Transactional
public ResponseEntity<?> updateHotspotLocation(@PathVariable Long deviceId, @RequestBody Map<String, String> payload) {
    Device device = deviceRepository.findById(deviceId).orElseThrow();
    String newLocation = payload.get("location");

    if ("Hotspot".equalsIgnoreCase(device.getType())) {
        List<Hotspot> hotspots = hotspotRepository.findByLocation(device.getOwned());
        for (Hotspot hotspot : hotspots) {
            hotspot.setLocation(newLocation);
            hotspotRepository.save(hotspot);
        }
        device.setOwned(newLocation);
        deviceRepository.save(device);
        return ResponseEntity.ok().build();
    }
    return ResponseEntity.badRequest().body("Device is not a Hotspot.");
}
    
@PostMapping("/hotspots/reassign-gallery/{deviceId}")
@Transactional
public ResponseEntity<?> reassignHotspotToGallery(@PathVariable Long deviceId, @RequestBody Map<String, String> payload) {
    Device device = deviceRepository.findById(deviceId).orElseThrow();
    String newGalleryName = payload.get("gallery");

    if (!"Hotspot".equalsIgnoreCase(device.getType()) || "Unassigned".equalsIgnoreCase(newGalleryName)) {
        return ResponseEntity.badRequest().body("Invalid reassignment request.");
    }

    List<Hotspot> hotspots = hotspotRepository.findByLocation("Unassigned");
    for (Hotspot hotspot : hotspots) {
        hotspot.setLocation(newGalleryName);
        hotspotRepository.save(hotspot);

        // Get new galleryId by name
        Long galleryId;
        try {
            Map<String, Object> response = restTemplate.getForObject(
                "http://gallery-service:8081/api/galleries/name/" + newGalleryName,
                Map.class
            );
            galleryId = Long.valueOf(response.get("id").toString());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Gallery not found.");
        }

        HotspotGallery hotspotGallery = HotspotGallery.builder()
            .id(new HotspotGalleryId(hotspot.getId(), galleryId))
            .hotspot(hotspot)
            .galleryId(galleryId)
            .assignedAt(LocalDateTime.now())
            .build();

        hotspotGalleryRepository.save(hotspotGallery);
    }

    device.setOwned(newGalleryName);
    deviceRepository.save(device);

    return ResponseEntity.ok().body("Hotspot reassigned successfully.");
}

@DeleteMapping("/unassign-gallery/{galleryId}")
@Transactional
public ResponseEntity<?> unassignGallery(@PathVariable Long galleryId) {
    List<HotspotGallery> hotspotLinks = hotspotGalleryRepository.findByGalleryId(galleryId);
    for (HotspotGallery link : hotspotLinks) {
        Hotspot hotspot = link.getHotspot();
        hotspot.setLocation("Unassigned");
        hotspotRepository.save(hotspot);

        List<DeviceHotspot> deviceHotspots = deviceHotspotRepository.findByHotspotId(hotspot.getId());
        for (DeviceHotspot dh : deviceHotspots) {
            Device device = dh.getDevice();
            device.setOwned("Unassigned");
            deviceRepository.save(device);
        }

        hotspotGalleryRepository.deleteById(link.getId());
    }

    return ResponseEntity.ok("Unassigned all related hotspots/devices for galleryId " + galleryId);
}

@PutMapping("/update-gallery-name")
@Transactional
public ResponseEntity<?> updateGalleryNameInDevices(@RequestBody Map<String, String> request) {
    String oldName = request.get("oldName");
    String newName = request.get("newName");

    // Update Hotspots
    List<Hotspot> hotspots = hotspotRepository.findByLocation(oldName);
    for (Hotspot hotspot : hotspots) {
        hotspot.setLocation(newName);
        hotspotRepository.save(hotspot);
    }

    // Update Devices
    List<Device> devices = deviceRepository.findByOwned(oldName);
    for (Device device : devices) {
        device.setOwned(newName);
        deviceRepository.save(device);
    }

    return ResponseEntity.ok("Updated locations and devices from " + oldName + " to " + newName);
}



    @DeleteMapping("/{id}")
    @Transactional
    public void deleteDevice(@PathVariable Long id) {
        Device device = deviceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Device not found with id: " + id));

        // Step 1: Find all DeviceHotspot links for this device.
        List<DeviceHotspot> deviceHotspotLinks = deviceHotspotRepository.findByDeviceId(id);

        // Step 2: If the device is of type "Hotspot", collect linked Hotspots for cleanup.
        List<Hotspot> hotspotsToCleanup = new java.util.ArrayList<>();
        if ("Hotspot".equalsIgnoreCase(device.getType())) {
            for (DeviceHotspot link : deviceHotspotLinks) {
                if (link.getHotspot() != null) {
                    hotspotsToCleanup.add(link.getHotspot());
                }
            }
        }

        // Step 3: Delete all DeviceHotspot links for this device.
        // This resolves the foreign key constraint violation.
        for (DeviceHotspot link : deviceHotspotLinks) {
            deviceHotspotRepository.delete(link);
        }

        // Step 4: If the device was a "Hotspot", clean up the collected Hotspot entities.
        if ("Hotspot".equalsIgnoreCase(device.getType())) {
            for (Hotspot hotspot : hotspotsToCleanup) {
                // Ensure hotspot still exists before trying to delete gallery or itself,
                // though after removing links, it should.
                if (hotspotRepository.existsById(hotspot.getId())) {
                    // 4a. Delete from hotspot_gallery
                    hotspotGalleryRepository.deleteByHotspotId(hotspot.getId());
                    // 4b. Delete the hotspot itself
                    hotspotRepository.deleteById(hotspot.getId());
                }
            }

            // Original logic also considered hotspots by device.getOwned().
            // This might be redundant if all relevant hotspots are found via DeviceHotspot links.
            // However, to be safe and match original intent for unlinked but "owned" hotspots:
            List<Hotspot> hotspotsAtOwnedLocation = hotspotRepository.findByLocation(device.getOwned());
            for (Hotspot hotspotInLocation : hotspotsAtOwnedLocation) {
                boolean alreadyProcessed = hotspotsToCleanup.stream()
                                            .anyMatch(h -> h.getId().equals(hotspotInLocation.getId()));
                if (!alreadyProcessed && hotspotRepository.existsById(hotspotInLocation.getId())) {
                    hotspotGalleryRepository.deleteByHotspotId(hotspotInLocation.getId());
                    hotspotRepository.deleteById(hotspotInLocation.getId());
                }
            }
        }

        // Step 5. Delete the device
        deviceRepository.deleteById(id);
    }
    

    
@Autowired
private EntityManager entityManager;
    private Long findGalleryIdByLocation(String location) {
    try {
        Long galleryId = entityManager.createQuery(
            "SELECT g.id FROM Gallery g WHERE g.location = :location", Long.class)
            .setParameter("location", location)
            .getSingleResult();
        return galleryId;
    } catch (NoResultException e) {
        throw new RuntimeException("Gallery not found for location: " + location);
    }
}

    @GetMapping
    public List<Device> getAllDevices() {
        return deviceRepository.findAll();
    }

    @GetMapping("/{id}")
    public Device getDevice(@PathVariable Long id) {
        return deviceRepository.findById(id).orElseThrow();
    }

    @PutMapping("/{id}")
    @Transactional
    public Device updateDevice(@PathVariable Long id, @RequestBody Device updated) {
        Device device = deviceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Device not found with id: " + id));

        String oldOwned = device.getOwned();
        String newOwned = updated.getOwned();

        // Update standard device fields
        device.setLabel(updated.getLabel());
        device.setOwned(newOwned);
        device.setIsOn(updated.getIsOn());
        device.setType(updated.getType());
        device.setBarcode(updated.getBarcode());

        // If it's a Hotspot device AND the 'owned' (gallery location) has changed
        if ("Hotspot".equalsIgnoreCase(device.getType()) && !oldOwned.equals(newOwned)) {
            // Find the DeviceHotspot link for this device
            List<DeviceHotspot> deviceHotspotLinks = deviceHotspotRepository.findByDeviceId(id);

            if (!deviceHotspotLinks.isEmpty()) {
                // Assuming a device can only be linked to one hotspot at a time for its primary function
                DeviceHotspot deviceHotspotLink = deviceHotspotLinks.get(0); 
                Hotspot actualHotspot = deviceHotspotLink.getHotspot();

                if (actualHotspot != null) {
                    // 1. Remove old hotspot-gallery relationship for the *actualHotspot*
                    hotspotGalleryRepository.deleteByHotspotId(actualHotspot.getId());

                    // 2. Update the actualHotspot's location to the new gallery name (device.owned)
                    actualHotspot.setLocation(newOwned);
                    hotspotRepository.save(actualHotspot);

                    // 3. If new location is not "Unassigned", create new hotspot-gallery relationship
                    if (!"Unassigned".equalsIgnoreCase(newOwned)) {
                        try {
                            Long galleryId = fetchGalleryId(newOwned);
                            HotspotGallery newHotspotGallery = HotspotGallery.builder()
                                    .id(new HotspotGalleryId(actualHotspot.getId(), galleryId))
                                    .hotspot(actualHotspot)
                                    .galleryId(galleryId)
                                    .assignedAt(LocalDateTime.now())
                                    .build();
                            hotspotGalleryRepository.save(newHotspotGallery);
                        } catch (Exception e) {
                            System.err.println("Warning: Could not create hotspot-gallery relationship for hotspot " 
                                + actualHotspot.getId() + " in gallery " + newOwned + ": " + e.getMessage());
                        }
                    }
                } else {
                    System.err.println("Warning: Device " + id + " is linked to a null hotspot in device_hotspot table.");
                }
            } else {
                System.err.println("Warning: Device " + id + " is a Hotspot but has no entry in device_hotspot table.");
            }
        }

        return deviceRepository.save(device);
    }
}
