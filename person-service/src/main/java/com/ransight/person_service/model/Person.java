package com.ransight.person_service.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "persons")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Person {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String name;
    private String surname;
    private String position;
    private String department;
    private String contact;
    private String status;
    private String location;
    private Double level;
    private String supervisor;
}
