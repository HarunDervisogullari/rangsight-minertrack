package com.ransight.person_service.repository;

import com.ransight.person_service.model.Person;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PersonRepository extends JpaRepository<Person, Integer> {
}
