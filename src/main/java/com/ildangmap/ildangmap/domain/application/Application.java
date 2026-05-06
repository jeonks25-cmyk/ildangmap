package com.ildangmap.ildangmap.domain.application;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 공고 제목
    private String jobTitle;

    // 지원자 이름
    private String workerName;

    // 상태
    private String status;
}