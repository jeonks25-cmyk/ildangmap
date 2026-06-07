package com.ildangmap.api.job;

import com.ildangmap.api.job.dto.JobSummaryResponse;
import com.ildangmap.domain.application.JobApplication;
import com.ildangmap.domain.job.JobStatus;
import com.ildangmap.repository.JobApplicationRepository;
import com.ildangmap.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class JobQueryService {

    private static final EnumSet<JobStatus> VISIBLE_ON_MAP =
            EnumSet.of(JobStatus.RECRUITING, JobStatus.FULL, JobStatus.CONFIRMED, JobStatus.WORKING);

    private final JobRepository jobRepository;
    private final JobApplicationRepository jobApplicationRepository;

    public List<JobSummaryResponse> getJobSummaries() {
        return jobRepository
                .findByStatusInAndWorkDateGreaterThanEqualOrderByWorkDateAsc(VISIBLE_ON_MAP, LocalDate.now())
                .stream()
                .map(job -> {
                    List<JobApplication> applications = jobApplicationRepository.findByJobIdOrderByIdAsc(job.getId());
                    return JobSummaryMapper.toResponse(job, applications);
                })
                .toList();
    }
}
