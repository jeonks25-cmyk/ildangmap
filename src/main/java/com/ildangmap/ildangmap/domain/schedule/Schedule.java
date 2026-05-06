package com.ildangmap.ildangmap.domain.schedule;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Schedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long jobId;      // ✅ 반드시 있어야됨

    private String title;
    private String workerName;
    private String date;
}