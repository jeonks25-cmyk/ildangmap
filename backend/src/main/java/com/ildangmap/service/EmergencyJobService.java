package com.ildangmap.service;

import com.ildangmap.domain.emergency.EmergencyJob;
import com.ildangmap.domain.emergency.EmergencyJobStatus;
import com.ildangmap.repository.EmergencyJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EmergencyJobService {

    private final EmergencyJobRepository emergencyJobRepository;

    public List<EmergencyJob> getOpenEmergencyJobs() {
        return emergencyJobRepository.findByStatusAndExpiresAtAfterOrderByExpiresAtAsc(
                EmergencyJobStatus.OPEN,
                LocalDateTime.now()
        );
    }
}
