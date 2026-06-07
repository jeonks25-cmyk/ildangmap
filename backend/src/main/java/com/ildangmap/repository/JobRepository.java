package com.ildangmap.repository;

import com.ildangmap.domain.job.Job;
import com.ildangmap.domain.job.JobStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface JobRepository extends JpaRepository<Job, Long> {

    List<Job> findByStatusOrderByWorkDateAsc(JobStatus status);

    List<Job> findByOwnerUserIdOrderByWorkDateDesc(Long ownerUserId);

    List<Job> findByStatusAndWorkDateGreaterThanEqualOrderByWorkDateAsc(JobStatus status, LocalDate workDate);

    List<Job> findByStatusInAndWorkDateGreaterThanEqualOrderByWorkDateAsc(Collection<JobStatus> statuses, LocalDate workDate);
}
