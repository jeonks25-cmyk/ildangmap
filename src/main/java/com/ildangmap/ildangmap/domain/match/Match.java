package com.ildangmap.ildangmap.domain.match;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long jobId;      // ✅ 추가
    private Long userId;     // ✅ 추가
    private String status;   // ✅ 추가
}