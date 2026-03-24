package com.ransight.device_service.repository;

import com.ransight.device_service.entity.PersonDevice;
import com.ransight.device_service.entity.PersonDevice.PersonDeviceId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PersonDeviceRepository extends JpaRepository<PersonDevice, PersonDeviceId> {
}
