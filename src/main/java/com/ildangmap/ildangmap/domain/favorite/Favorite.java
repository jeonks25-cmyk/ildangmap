package com.ildangmap.ildangmap.domain.favorite;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class Favorite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 기술자 이름
    private String workerName;

    // 오야지 이름
    private String bossName;

    // 메모
    private String memo;
}