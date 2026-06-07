package com.ildangmap.domain.application;

import com.ildangmap.domain.job.Job;
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
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
        name = "job_applications",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_job_applications_job_applicant",
                columnNames = {"job_id", "applicant_user_id"}
        ),
        indexes = {
                @Index(name = "idx_job_applications_job", columnList = "job_id"),
                @Index(name = "idx_job_applications_applicant", columnList = "applicant_user_id")
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JobApplication extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @Column(name = "applicant_user_id", nullable = false)
    private Long applicantUserId;

    @Column(length = 40)
    private String role;

    @Column(length = 500)
    private String memo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private JobApplicationStatus status;

    public void transitionToAccepted() {
        if (this.status != JobApplicationStatus.PENDING) {
            throw new IllegalStateException("NOT_PENDING");
        }
        this.status = JobApplicationStatus.ACCEPTED;
    }

    public void transitionToRejected() {
        if (this.status != JobApplicationStatus.PENDING) {
            throw new IllegalStateException("NOT_PENDING");
        }
        this.status = JobApplicationStatus.REJECTED;
    }

    @Builder
    public JobApplication(Job job, Long applicantUserId, String role, String memo, JobApplicationStatus status) {
        this.job = job;
        this.applicantUserId = applicantUserId;
        this.role = role;
        this.memo = memo;
        this.status = status != null ? status : JobApplicationStatus.PENDING;
    }
}
