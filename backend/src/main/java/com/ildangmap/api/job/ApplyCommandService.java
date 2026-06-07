package com.ildangmap.api.job;

import com.ildangmap.api.job.dto.ApplyJobRequest;
import com.ildangmap.api.job.dto.ApplyJobResponse;
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
import org.springframework.util.StringUtils;

import java.util.EnumSet;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ApplyCommandService {

    private static final Long DEFAULT_APPLICANT_USER_ID = 1L;
    private static final EnumSet<JobApplicationStatus> ACTIVE_APPLICATION_STATUSES =
            EnumSet.of(JobApplicationStatus.PENDING, JobApplicationStatus.ACCEPTED);

    private final JobRepository jobRepository;
    private final JobApplicationRepository jobApplicationRepository;
    private final SessionUserService sessionUserService;

    @Transactional
    public ApplyJobResponse apply(Long jobId, ApplyJobRequest request) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("공고를 찾을 수 없습니다."));

        if (job.getStatus() != JobStatus.RECRUITING) {
            throw new BadRequestException("모집 중인 공고만 지원할 수 있습니다.");
        }

        Optional<Long> sessionApplicantId = sessionUserService.resolveCurrentUserId();
        Long applicantUserId = sessionApplicantId.orElseGet(() ->
                request.getApplicantUserId() != null ? request.getApplicantUserId() : DEFAULT_APPLICANT_USER_ID);

        if (jobApplicationRepository.existsByJobIdAndApplicantUserId(jobId, applicantUserId)) {
            throw new BadRequestException("이미 지원한 공고입니다.");
        }

        int maxApplicantCount = JobSummaryMapper.resolveMaxApplicantCount(job);
        long currentCount = jobApplicationRepository.countByJobIdAndStatusIn(jobId, ACTIVE_APPLICATION_STATUSES);
        if (currentCount >= maxApplicantCount) {
            throw new BadRequestException("모집 정원이 마감되었습니다.");
        }

        String role = StringUtils.hasText(request.getRole()) ? request.getRole().trim() : job.getRole();

        JobApplication saved = jobApplicationRepository.save(
                JobApplication.builder()
                        .job(job)
                        .applicantUserId(applicantUserId)
                        .role(role)
                        .memo(request.getMemo())
                        .status(JobApplicationStatus.PENDING)
                        .build()
        );

        int nextCount = (int) jobApplicationRepository.countByJobIdAndStatusIn(jobId, ACTIVE_APPLICATION_STATUSES);
        long acceptedCount = jobApplicationRepository.countByJobIdAndStatusIn(
                jobId, EnumSet.of(JobApplicationStatus.ACCEPTED));
        job.syncRecruitmentFromApplicantCounts(nextCount, maxApplicantCount, acceptedCount);
        jobRepository.save(job);

        boolean autoClosed = job.isShortHelpJob() && nextCount >= maxApplicantCount && job.getStatus() == JobStatus.FULL;

        List<JobApplication> applications = jobApplicationRepository.findByJobIdOrderByIdAsc(jobId);
        return ApplyJobResponse.builder()
                .jobId(job.getId())
                .applicantId(saved.getId())
                .status(mapApplicationStatus(saved.getStatus()))
                .currentApplicantCount(nextCount)
                .maxApplicantCount(maxApplicantCount)
                .autoClosed(autoClosed)
                .job(JobSummaryMapper.toResponse(job, applications))
                .build();
    }

    private String mapApplicationStatus(JobApplicationStatus status) {
        if (status == JobApplicationStatus.ACCEPTED) {
            return "ACCEPTED";
        }
        if (status == JobApplicationStatus.REJECTED) {
            return "REJECTED";
        }
        return "PENDING";
    }
}
