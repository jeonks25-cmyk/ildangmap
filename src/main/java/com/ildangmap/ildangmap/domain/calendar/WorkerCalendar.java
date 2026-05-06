package com.ildangmap.ildangmap.domain.calendar;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkerCalendar {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 기술자 이름
    private String workerName;

    // 날짜
    private String workDate;

    // 상태 (가능 / 불가능 / 예약됨)
    private String status;

    // 메모
    private String memo;
}