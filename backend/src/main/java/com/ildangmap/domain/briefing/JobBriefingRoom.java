package com.ildangmap.domain.briefing;

import com.ildangmap.domain.job.Job;
import com.ildangmap.global.persistence.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "job_briefing_rooms")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JobBriefingRoom extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_id", nullable = false, unique = true)
    private Job job;

    /** 출입·집결 안내(비밀번호 등) — 미입력 시 공고 locationText 등으로 보완 */
    @Column(name = "entry_info", length = 600)
    private String entryInfo;

    @Column(name = "parking_info", length = 600)
    private String parkingInfo;

    @Column(name = "work_summary", length = 1200)
    private String workSummary;

    @Builder
    public JobBriefingRoom(Job job, String entryInfo, String parkingInfo, String workSummary) {
        this.job = job;
        this.entryInfo = entryInfo;
        this.parkingInfo = parkingInfo;
        this.workSummary = workSummary;
    }
}
