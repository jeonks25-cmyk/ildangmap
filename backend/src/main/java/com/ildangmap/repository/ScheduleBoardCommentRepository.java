package com.ildangmap.repository;

import com.ildangmap.domain.scheduleboard.ScheduleBoardComment;
import com.ildangmap.domain.scheduleboard.ScheduleBoardPost;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScheduleBoardCommentRepository extends JpaRepository<ScheduleBoardComment, Long> {

    List<ScheduleBoardComment> findByPostOrderByCreatedAtAsc(ScheduleBoardPost post);

    long countByPost(ScheduleBoardPost post);
}
