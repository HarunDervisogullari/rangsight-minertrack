package com.ransight.person_service.controller;

import com.ransight.person_service.model.Person;
import com.ransight.person_service.repository.PersonRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/persons")
@CrossOrigin
public class PersonController {

    @Autowired
    private PersonRepository personRepository;

    @GetMapping
    public List<Person> getAllPersons() {
        return personRepository.findAll();
    }

    @GetMapping("/{id}")
    public Optional<Person> getPersonById(@PathVariable Integer id) {
        return personRepository.findById(id);
    }

    @PostMapping
    public Person createPerson(@RequestBody Person person) {
        return personRepository.save(person);
    }

    @PutMapping("/{id}")
    public Person updatePerson(@PathVariable Integer id, @RequestBody Person person) {
        person.setId(id);
        return personRepository.save(person);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePerson(@PathVariable Integer id) {
        try {
            personRepository.deleteById(id);
            return ResponseEntity.ok().build();
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.status(500).body("This person is still referenced in user_person.");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Failed to delete person.");
        }
    }

}
