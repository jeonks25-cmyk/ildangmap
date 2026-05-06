package com.ildangmap.ildangmap.domain.invitation;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Invitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long jobId;     // 공고
    private Long bossId;    // 오야지
    private Long workerId;  // 기술자

    private String status;  // PENDING / ACCEPT / REJECT
}