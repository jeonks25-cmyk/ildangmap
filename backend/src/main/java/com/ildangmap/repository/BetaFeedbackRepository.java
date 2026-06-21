package com.ildangmap.repository;

import com.ildangmap.domain.feedback.BetaFeedback;
import com.ildangmap.domain.feedback.BetaFeedbackSeverity;
import com.ildangmap.domain.feedback.BetaFeedbackStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface BetaFeedbackRepository extends JpaRepository<BetaFeedback, Long> {

    long countBySimilarityGroupKey(String similarityGroupKey);

    @EntityGraph(attributePaths = "attachments")
    Optional<BetaFeedback> findWithAttachmentsById(Long id);

    @EntityGraph(attributePaths = "attachments")
    Page<BetaFeedback> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @EntityGraph(attributePaths = "attachments")
    Page<BetaFeedback> findByStatusOrderByCreatedAtDesc(BetaFeedbackStatus status, Pageable pageable);

    @EntityGraph(attributePaths = "attachments")
    Page<BetaFeedback> findBySeverityOrderByCreatedAtDesc(BetaFeedbackSeverity severity, Pageable pageable);

    @EntityGraph(attributePaths = "attachments")
    Page<BetaFeedback> findByStatusAndSeverityOrderByCreatedAtDesc(
            BetaFeedbackStatus status,
            BetaFeedbackSeverity severity,
            Pageable pageable
    );

    @Query("""
            SELECT f.similarityGroupKey AS groupKey, COUNT(f) AS cnt
            FROM BetaFeedback f
            GROUP BY f.similarityGroupKey
            ORDER BY COUNT(f) DESC
            """)
    List<SimilarityGroupCount> countGroupedBySimilarity();

    interface SimilarityGroupCount {
        String getGroupKey();

        long getCnt();
    }
}
