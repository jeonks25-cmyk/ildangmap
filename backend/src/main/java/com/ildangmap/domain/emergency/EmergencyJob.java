package com.ildangmap.domain.emergency;

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

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Entity
@Table(
        name = "emergency_jobs",
        indexes = {
                @Index(name = "idx_emergency_jobs_job", columnList = "job_id"),
                @Index(name = "idx_emergency_jobs_status", columnList = "status"),
                @Index(name = "idx_emergency_jobs_region", columnList = "region")
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EmergencyJob extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_id", nullable = false)
    private Long jobId;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, length = 100)
    private String region;

    @Column(length = 500)
    private String description;

    @Column(name = "emergency_pay_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal emergencyPayAmount;

    @Column(name = "required_minutes", nullable = false)
    private Integer requiredMinutes;

    @Column
    private Double lat;

    @Column
    private Double lng;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EmergencyJobStatus status;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Builder
    public EmergencyJob(
            Long jobId,
            String title,
            String region,
            String description,
            BigDecimal emergencyPayAmount,
            Integer requiredMinutes,
            Double lat,
            Double lng,
            EmergencyJobStatus status,
            LocalDateTime expiresAt
    ) {
        this.jobId = jobId;
        this.title = title;
        this.region = region;
        this.description = description;
        this.emergencyPayAmount = emergencyPayAmount;
        this.requiredMinutes = requiredMinutes;
        this.lat = lat;
        this.lng = lng;
        this.status = status;
        this.expiresAt = expiresAt;
    }
}
