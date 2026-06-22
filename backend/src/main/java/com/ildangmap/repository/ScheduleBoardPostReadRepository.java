package com.ildangmap.repository;

import com.ildangmap.domain.scheduleboard.ScheduleBoardPost;
import com.ildangmap.domain.scheduleboard.ScheduleBoardPostRead;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScheduleBoardPostReadRepository extends JpaRepository<ScheduleBoardPostRead, Long> {

    Optional<ScheduleBoardPostRead> findByUserIdAndPost(Long userId, ScheduleBoardPost post);

    boolean existsByUserIdAndPost_Id(Long userId, Long postId);
}
