package com.ildangmap.repository;

import com.ildangmap.domain.emergency.EmergencyJob;
import com.ildangmap.domain.emergency.EmergencyJobStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface EmergencyJobRepository extends JpaRepository<EmergencyJob, Long> {

    List<EmergencyJob> findByStatusAndExpiresAtAfterOrderByExpiresAtAsc(EmergencyJobStatus status, LocalDateTime expiresAt);

    Optional<EmergencyJob> findByJobId(Long jobId);
}
