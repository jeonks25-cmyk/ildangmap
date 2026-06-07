package com.ildangmap.api.job;

import com.ildangmap.api.job.dto.JobSummaryResponse;
import com.ildangmap.domain.job.Job;
import com.ildangmap.domain.job.JobStatus;
import com.ildangmap.global.exception.BadRequestException;
import com.ildangmap.global.exception.ResourceNotFoundException;
import com.ildangmap.repository.JobRepository;
import com.ildangmap.service.SessionUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class JobLifecycleCommandService {

    private final JobRepository jobRepository;
    private final SessionUserService sessionUserService;

    @Transactional
    public JobSummaryResponse closeRecruitment(Long jobId) {
        Job job = loadOwnedJob(jobId);
        job.closeRecruitmentManually();
        jobRepository.save(job);
        return JobSummaryMapper.toResponse(job);
    }

    @Transactional
    public JobSummaryResponse startWork(Long jobId) {
        Job job = loadOwnedJob(jobId);
        if (job.getWorkDate() != null && job.getWorkDate().isAfter(LocalDate.now())) {
            throw new BadRequestException("작업일 이전에는 작업을 시작할 수 없습니다.");
        }
        try {
            job.startWork();
        } catch (IllegalStateException ex) {
            throw new BadRequestException(ex.getMessage());
        }
        jobRepository.save(job);
        return JobSummaryMapper.toResponse(job);
    }

    @Transactional
    public JobSummaryResponse completeWork(Long jobId) {
        Job job = loadOwnedJob(jobId);
        try {
            job.completeWork();
        } catch (IllegalStateException ex) {
            throw new BadRequestException(ex.getMessage());
        }
        jobRepository.save(job);
        return JobSummaryMapper.toResponse(job);
    }

    @Transactional
    public JobSummaryResponse cancelJob(Long jobId) {
        Job job = loadOwnedJob(jobId);
        if (job.getStatus() == JobStatus.CANCELLED) {
            return JobSummaryMapper.toResponse(job);
        }
        try {
            job.cancelJob();
        } catch (IllegalStateException ex) {
            throw new BadRequestException(ex.getMessage());
        }
        jobRepository.save(job);
        return JobSummaryMapper.toResponse(job);
    }

    private Job loadOwnedJob(Long jobId) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("공고를 찾을 수 없습니다."));
        Long viewerId = sessionUserService.resolveCurrentUserId()
                .orElseThrow(() -> new BadRequestException("로그인이 필요합니다."));
        if (!viewerId.equals(job.getOwnerUserId())) {
            throw new BadRequestException("공고 소유자만 상태를 변경할 수 있습니다.");
        }
        return job;
    }
}
