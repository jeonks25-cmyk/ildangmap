package com.ildangmap.domain.job;

import com.ildangmap.domain.application.JobApplication;
import com.ildangmap.global.persistence.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Entity
@Table(
        name = "jobs",
        indexes = {
                @Index(name = "idx_jobs_owner", columnList = "owner_user_id"),
                @Index(name = "idx_jobs_status_date", columnList = "status, work_date"),
                @Index(name = "idx_jobs_region", columnList = "short_address")
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Job extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_user_id", nullable = false)
    private Long ownerUserId;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, length = 40)
    private String trade;

    @Column(nullable = false, length = 40)
    private String role;

    @Column(name = "pay_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal payAmount;

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(name = "location_text", length = 120)
    private String locationText;

    @Column(name = "short_address", nullable = false, length = 120)
    private String shortAddress;

    @Column(name = "full_address", length = 255)
    private String fullAddress;

    @Column
    private Double lat;

    @Column
    private Double lng;

    @Column(name = "distance_km", precision = 8, scale = 2)
    private BigDecimal distanceKm;

    @Column(name = "work_type", length = 40)
    private String workType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private JobStatus status;

    @Column(name = "parking_available", nullable = false)
    private boolean parkingAvailable;

    @Column(name = "meal_provided", nullable = false)
    private boolean mealProvided;

    @Column(name = "night_work", nullable = false)
    private boolean nightWork;

    @Column(name = "long_term", nullable = false)
    private boolean longTerm;

    @OneToMany(mappedBy = "job", fetch = FetchType.LAZY)
    private List<JobApplication> applications = new ArrayList<>();

    /**
     * 지원자 수(대기+확정)와 확정 수를 반영해 모집 단계만 조정한다. (취소·작업·완료는 건드리지 않음)
     */
    public void syncRecruitmentFromApplicantCounts(int activeApplicantCount, int maxApplicants, long acceptedCount) {
        if (this.status == JobStatus.CANCELLED
                || this.status == JobStatus.COMPLETED
                || this.status == JobStatus.WORKING) {
            return;
        }
        if (maxApplicants <= 0) {
            return;
        }
        if (acceptedCount >= maxApplicants) {
            this.status = JobStatus.CONFIRMED;
            return;
        }
        if (this.status == JobStatus.CONFIRMED) {
            this.status = activeApplicantCount >= maxApplicants ? JobStatus.FULL : JobStatus.RECRUITING;
            return;
        }
        if (activeApplicantCount >= maxApplicants) {
            if (this.status == JobStatus.RECRUITING) {
                this.status = JobStatus.FULL;
            }
        } else if (this.status == JobStatus.FULL) {
            this.status = JobStatus.RECRUITING;
        }
    }

    public void startWork() {
        if (this.status != JobStatus.CONFIRMED) {
            throw new IllegalStateException("확정된 공고만 작업을 시작할 수 있습니다.");
        }
        this.status = JobStatus.WORKING;
    }

    public void completeWork() {
        if (this.status != JobStatus.WORKING) {
            throw new IllegalStateException("작업 중인 공고만 완료 처리할 수 있습니다.");
        }
        this.status = JobStatus.COMPLETED;
    }

    public void cancelJob() {
        if (this.status == JobStatus.COMPLETED) {
            throw new IllegalStateException("완료된 공고는 취소할 수 없습니다.");
        }
        this.status = JobStatus.CANCELLED;
    }

    /** 모집 마감(placeholder): 모집 중이면 정원과 무관하게 모집 단계 종료로 표시 */
    public void closeRecruitmentManually() {
        if (this.status == JobStatus.RECRUITING) {
            this.status = JobStatus.FULL;
        }
    }

    public boolean isShortHelpJob() {
        return "SHORT_HELP".equalsIgnoreCase(workType);
    }

    @Builder
    public Job(
            Long ownerUserId,
            String title,
            String trade,
            String role,
            BigDecimal payAmount,
            LocalDate workDate,
            LocalTime startTime,
            LocalTime endTime,
            String locationText,
            String shortAddress,
            String fullAddress,
            Double lat,
            Double lng,
            BigDecimal distanceKm,
            String workType,
            JobStatus status,
            boolean parkingAvailable,
            boolean mealProvided,
            boolean nightWork,
            boolean longTerm
    ) {
        this.ownerUserId = ownerUserId;
        this.title = title;
        this.trade = trade;
        this.role = role;
        this.payAmount = payAmount;
        this.workDate = workDate;
        this.startTime = startTime;
        this.endTime = endTime;
        this.locationText = locationText;
        this.shortAddress = shortAddress;
        this.fullAddress = fullAddress;
        this.lat = lat;
        this.lng = lng;
        this.distanceKm = distanceKm;
        this.workType = workType;
        this.status = status;
        this.parkingAvailable = parkingAvailable;
        this.mealProvided = mealProvided;
        this.nightWork = nightWork;
        this.longTerm = longTerm;
    }
}
