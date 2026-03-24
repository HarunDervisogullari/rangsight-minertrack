package com.ransight.device_service.controller;
import org.springframework.http.ResponseEntity;

import com.ransight.device_service.entity.PersonDevice;
import com.ransight.device_service.entity.PersonDevice.PersonDeviceId;
import com.ransight.device_service.repository.PersonDeviceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/person-device")
@RequiredArgsConstructor
public class PersonDeviceController {

    private final PersonDeviceRepository personDeviceRepository;

    @PostMapping
    public PersonDevice assignPersonToDevice(@RequestBody AssignmentRequest request) {
        PersonDeviceId id = new PersonDeviceId(request.getPersonId(), request.getDeviceId());
        PersonDevice assignment = new PersonDevice(id, request.getAssignedAt());
        return personDeviceRepository.save(assignment);
    }

    @DeleteMapping("/{personId}/{deviceId}")
    public ResponseEntity<?> unassignHelmet(@PathVariable Long personId, @PathVariable Long deviceId) {
        PersonDeviceId id = new PersonDeviceId(personId, deviceId);
        if (personDeviceRepository.existsById(id)) {
            personDeviceRepository.deleteById(id);
            return ResponseEntity.ok().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping
    public List<PersonDevice> getAllAssignments() {
        return personDeviceRepository.findAll();
    }
    public static class AssignmentRequest {
        private Long personId;
        private Long deviceId;
        private LocalDateTime assignedAt;

        public Long getPersonId() { return personId; }
        public void setPersonId(Long personId) { this.personId = personId; }

        public Long getDeviceId() { return deviceId; }
        public void setDeviceId(Long deviceId) { this.deviceId = deviceId; }

        public LocalDateTime getAssignedAt() { return assignedAt; }
        public void setAssignedAt(LocalDateTime assignedAt) { this.assignedAt = assignedAt; }
    }
}
