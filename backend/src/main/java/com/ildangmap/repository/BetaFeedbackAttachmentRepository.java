package com.ildangmap.repository;

import com.ildangmap.domain.feedback.BetaFeedbackAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BetaFeedbackAttachmentRepository extends JpaRepository<BetaFeedbackAttachment, Long> {

    Optional<BetaFeedbackAttachment> findByIdAndFeedbackUserId(Long id, Long userId);
}
