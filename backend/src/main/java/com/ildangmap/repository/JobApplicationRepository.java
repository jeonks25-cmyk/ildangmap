package com.ildangmap.repository;

import com.ildangmap.domain.application.JobApplication;
import com.ildangmap.domain.application.JobApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface JobApplicationRepository extends JpaRepository<JobApplication, Long> {

    boolean existsByJobIdAndApplicantUserId(Long jobId, Long applicantUserId);

    long countByJobIdAndStatusIn(Long jobId, Collection<JobApplicationStatus> statuses);

    List<JobApplication> findByJobIdOrderByIdAsc(Long jobId);

    boolean existsByJobIdAndApplicantUserIdAndStatus(Long jobId, Long applicantUserId, JobApplicationStatus status);
}
