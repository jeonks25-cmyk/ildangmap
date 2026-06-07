package com.ildangmap.service;

import com.ildangmap.domain.job.Job;
import com.ildangmap.domain.job.JobStatus;
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
public class JobService {

    private static final EnumSet<JobStatus> VISIBLE_ON_MAP =
            EnumSet.of(JobStatus.RECRUITING, JobStatus.FULL, JobStatus.CONFIRMED, JobStatus.WORKING);

    private final JobRepository jobRepository;

    public List<Job> getOpenJobs() {
        return jobRepository.findByStatusInAndWorkDateGreaterThanEqualOrderByWorkDateAsc(VISIBLE_ON_MAP, LocalDate.now());
    }

    public List<Job> getOwnerJobs(Long ownerUserId) {
        return jobRepository.findByOwnerUserIdOrderByWorkDateDesc(ownerUserId);
    }
}
