package com.ildangmap.domain.place;

import com.ildangmap.global.persistence.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
        name = "place_report",
        indexes = {
                @Index(name = "idx_place_report_place_created", columnList = "place_id, created_at"),
                @Index(name = "idx_place_report_reporter", columnList = "reporter_id")
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PlaceReport extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "place_id", nullable = false)
    private MapPlace place;

    @Column(name = "reporter_id", nullable = false)
    private Long reporterId;

    @Column(nullable = false, length = 120)
    private String reason;

    @Builder
    public PlaceReport(MapPlace place, Long reporterId, String reason) {
        this.place = place;
        this.reporterId = reporterId;
        this.reason = reason;
    }

    void bindPlace(MapPlace mapPlace) {
        this.place = mapPlace;
    }
}
