package com.ransight.device_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.time.LocalDateTime;

@Entity
@Table(name = "person_device")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PersonDevice {

    @EmbeddedId
    private PersonDeviceId id;

    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    @Embeddable
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PersonDeviceId implements Serializable {
        @Column(name = "person_id")
        private Long personId;

        @Column(name = "device_id")
        private Long deviceId;
    }
}
