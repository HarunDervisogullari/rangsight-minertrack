package com.ransight.device_service.repository;

import com.ransight.device_service.entity.Device;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DeviceRepository extends JpaRepository<Device, Long> {

    List<Device> findByOwned(String oldName);
}
