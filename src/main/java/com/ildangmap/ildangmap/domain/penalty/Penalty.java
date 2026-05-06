package com.ildangmap.ildangmap.domain.penalty;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Penalty {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 유저명
    private String userName;

    // 사유 (노쇼 / 지각 / 당일취소)
    private String reason;

    // 점수
    private Integer score;

    // 날짜
    private String createdDate;
}