package com.ildangmap.repository;

import com.ildangmap.domain.briefing.JobBriefingPost;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobBriefingPostRepository extends JpaRepository<JobBriefingPost, Long> {

    List<JobBriefingPost> findByRoom_IdOrderByCreatedAtDesc(Long roomId);
}
