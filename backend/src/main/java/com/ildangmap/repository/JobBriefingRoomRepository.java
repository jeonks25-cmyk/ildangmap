package com.ildangmap.repository;

import com.ildangmap.domain.briefing.JobBriefingRoom;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobBriefingRoomRepository extends JpaRepository<JobBriefingRoom, Long> {

    Optional<JobBriefingRoom> findByJob_Id(Long jobId);
}
