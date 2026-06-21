package com.ildangmap.domain.place;

import com.ildangmap.global.persistence.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(
        name = "map_place",
        indexes = {
                @Index(name = "idx_map_place_external_id", columnList = "external_id", unique = true),
                @Index(name = "idx_map_place_status", columnList = "status"),
                @Index(name = "idx_map_place_last_report", columnList = "last_report_at")
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MapPlace extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "external_id", nullable = false, length = 180)
    private String externalId;

    @Column(length = 200)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PlaceStatus status;

    @Column(name = "report_count", nullable = false)
    private int reportCount;

    @Column(name = "correct_count", nullable = false)
    private int correctCount;

    @Column(name = "incorrect_count", nullable = false)
    private int incorrectCount;

    @Column(name = "admin_locked", nullable = false)
    private boolean adminLocked;

    @Column(name = "deleted", nullable = false)
    private boolean deleted;

    @Column(name = "last_report_at")
    private LocalDateTime lastReportAt;

    @Builder
    public MapPlace(String externalId, String title) {
        this.externalId = externalId;
        this.title = title != null ? title : "";
        this.status = PlaceStatus.ACTIVE;
        this.reportCount = 0;
        this.correctCount = 0;
        this.incorrectCount = 0;
        this.adminLocked = false;
        this.deleted = false;
    }

    public void updateTitle(String nextTitle) {
        if (nextTitle != null && !nextTitle.isBlank()) {
            this.title = nextTitle.trim();
        }
    }

    public void applyCounts(int reportCount, int correctCount, int incorrectCount) {
        this.reportCount = reportCount;
        this.correctCount = correctCount;
        this.incorrectCount = incorrectCount;
    }

    public void applyStatus(PlaceStatus status) {
        this.status = status;
    }

    public void lockAdminStatus(PlaceStatus status) {
        this.adminLocked = true;
        this.status = status;
    }

    public void markDeleted() {
        this.deleted = true;
        this.status = PlaceStatus.HIDDEN;
        this.adminLocked = true;
    }

    public void touchLastReport(LocalDateTime at) {
        this.lastReportAt = at;
    }
}
