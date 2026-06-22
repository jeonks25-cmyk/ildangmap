package com.ildangmap.repository;

import com.ildangmap.domain.scheduleboard.ScheduleBoardPost;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.ildangmap.domain.scheduleboard.ScheduleBoardPostImage;

public interface ScheduleBoardPostImageRepository extends JpaRepository<ScheduleBoardPostImage, Long> {

    List<ScheduleBoardPostImage> findByPostOrderBySortOrderAsc(ScheduleBoardPost post);

    long countByPost(ScheduleBoardPost post);
}
