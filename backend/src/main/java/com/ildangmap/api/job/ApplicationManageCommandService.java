package com.ildangmap.api.job;

import com.ildangmap.domain.application.JobApplication;
import com.ildangmap.domain.application.JobApplicationStatus;
import com.ildangmap.domain.job.Job;
import com.ildangmap.domain.job.JobStatus;
import com.ildangmap.global.exception.BadRequestException;
import com.ildangmap.global.exception.ResourceNotFoundException;
import com.ildangmap.repository.JobApplicationRepository;
import com.ildangmap.repository.JobRepository;
import com.ildangmap.service.SessionUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;

@Service
@RequiredArgsConstructor
public class ApplicationManageCommandService {

    private static final EnumSet<JobApplicationStatus> ACCEPTED_ONLY =
            EnumSet.of(JobApplicationStatus.ACCEPTED);

    private static final EnumSet<JobApplicationStatus> ACTIVE_APPLICATION_STATUSES =
            EnumSet.of(JobApplicationStatus.PENDING, JobApplicationStatus.ACCEPTED);

    private final JobApplicationRepository jobApplicationRepository;
    private final JobRepository jobRepository;
    private final SessionUserService sessionUserService;

    @Transactional
    public void approve(Long applicationId) {
        JobApplication application = jobApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("지원을 찾을 수 없습니다."));
        Job job = jobRepository.findById(application.getJob().getId())
                .orElseThrow(() -> new ResourceNotFoundException("공고를 찾을 수 없습니다."));

        assertOwner(job);

        if (job.getStatus() != JobStatus.RECRUITING && job.getStatus() != JobStatus.FULL && job.getStatus() != JobStatus.CONFIRMED) {
            throw new BadRequestException("모집·확정 단계의 공고만 승인할 수 있습니다.");
        }

        if (application.getStatus() != JobApplicationStatus.PENDING) {
            throw new BadRequestException("대기 중인 지원만 승인할 수 있습니다.");
        }

        int max = JobSummaryMapper.resolveMaxApplicantCount(job);
        long acceptedCount = jobApplicationRepository.countByJobIdAndStatusIn(job.getId(), ACCEPTED_ONLY);
        if (acceptedCount >= max) {
            throw new BadRequestException("확정 정원이 찼습니다.");
        }

        try {
            application.transitionToAccepted();
        } catch (IllegalStateException ex) {
            throw new BadRequestException("대기 중인 지원만 승인할 수 있습니다.");
        }
        jobApplicationRepository.saveAndFlush(application);

        long acceptedAfter = jobApplicationRepository.countByJobIdAndStatusIn(job.getId(), ACCEPTED_ONLY);
        long activeCount = jobApplicationRepository.countByJobIdAndStatusIn(job.getId(), ACTIVE_APPLICATION_STATUSES);
        job.syncRecruitmentFromApplicantCounts((int) activeCount, max, acceptedAfter);
        jobRepository.save(job);
    }

    @Transactional
    public void reject(Long applicationId) {
        JobApplication application = jobApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("지원을 찾을 수 없습니다."));
        Job job = jobRepository.findById(application.getJob().getId())
                .orElseThrow(() -> new ResourceNotFoundException("공고를 찾을 수 없습니다."));

        assertOwner(job);

        if (job.getStatus() != JobStatus.RECRUITING && job.getStatus() != JobStatus.FULL && job.getStatus() != JobStatus.CONFIRMED) {
            throw new BadRequestException("모집·확정 단계의 공고만 거절할 수 있습니다.");
        }

        if (application.getStatus() != JobApplicationStatus.PENDING) {
            throw new BadRequestException("대기 중인 지원만 거절할 수 있습니다.");
        }

        try {
            application.transitionToRejected();
        } catch (IllegalStateException ex) {
            throw new BadRequestException("대기 중인 지원만 거절할 수 있습니다.");
        }
        jobApplicationRepository.save(application);

        int max = JobSummaryMapper.resolveMaxApplicantCount(job);
        long activeCount = jobApplicationRepository.countByJobIdAndStatusIn(job.getId(), ACTIVE_APPLICATION_STATUSES);
        long acceptedCount = jobApplicationRepository.countByJobIdAndStatusIn(job.getId(), ACCEPTED_ONLY);
        job.syncRecruitmentFromApplicantCounts((int) activeCount, max, acceptedCount);
        jobRepository.save(job);
    }

    private void assertOwner(Job job) {
        Long viewerId = sessionUserService.resolveCurrentUserId()
                .orElseThrow(() -> new BadRequestException("로그인이 필요합니다."));
        if (!viewerId.equals(job.getOwnerUserId())) {
            throw new BadRequestException("공고 소유자만 처리할 수 있습니다.");
        }
    }
}
