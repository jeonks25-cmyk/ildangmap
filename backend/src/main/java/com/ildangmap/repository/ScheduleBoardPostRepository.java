package com.ildangmap.repository;

import com.ildangmap.domain.scheduleboard.ScheduleBoardPost;
import com.ildangmap.domain.scheduleboard.ScheduleBoardPostType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ScheduleBoardPostRepository extends JpaRepository<ScheduleBoardPost, Long> {

    @Query(
            """
            SELECT p FROM ScheduleBoardPost p
            WHERE p.scheduleId = :scheduleId AND p.deletedAt IS NULL
            ORDER BY
              CASE WHEN p.postType = com.ildangmap.domain.scheduleboard.ScheduleBoardPostType.notice THEN 0 ELSE 1 END,
              p.createdAt DESC
            """)
    List<ScheduleBoardPost> findActiveByScheduleIdOrderPinned(@Param("scheduleId") String scheduleId);

    Optional<ScheduleBoardPost> findByIdAndScheduleIdAndDeletedAtIsNull(Long id, String scheduleId);

    long countByScheduleIdAndDeletedAtIsNull(String scheduleId);

    @Query(
            """
            SELECT COUNT(p) FROM ScheduleBoardPost p
            WHERE p.scheduleId = :scheduleId
              AND p.postType = :postType
              AND p.deletedAt IS NULL
              AND p.authorUserId <> :viewerUserId
              AND NOT EXISTS (
                SELECT 1 FROM ScheduleBoardPostRead r
                WHERE r.userId = :viewerUserId AND r.post = p
              )
            """)
    long countUnreadByType(
            @Param("scheduleId") String scheduleId,
            @Param("postType") ScheduleBoardPostType postType,
            @Param("viewerUserId") Long viewerUserId);

    @Query(
            """
            SELECT COUNT(p) FROM ScheduleBoardPost p
            WHERE p.scheduleId = :scheduleId
              AND p.postType IN :types
              AND p.deletedAt IS NULL
              AND p.authorUserId <> :viewerUserId
              AND NOT EXISTS (
                SELECT 1 FROM ScheduleBoardPostRead r
                WHERE r.userId = :viewerUserId AND r.post = p
              )
            """)
    long countUnreadByTypes(
            @Param("scheduleId") String scheduleId,
            @Param("types") List<ScheduleBoardPostType> types,
            @Param("viewerUserId") Long viewerUserId);

    @Query(
            """
            SELECT MAX(p.createdAt) FROM ScheduleBoardPost p
            WHERE p.scheduleId = :scheduleId AND p.deletedAt IS NULL
            """)
    Optional<java.time.LocalDateTime> findLastPostAt(@Param("scheduleId") String scheduleId);
}
