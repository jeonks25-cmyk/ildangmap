package com.ildangmap.api.feedback.dto;

import com.ildangmap.domain.feedback.BetaFeedback;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class BetaFeedbackCreatedResponse {

    private final Long id;
    private final String status;
    private final LocalDateTime createdAt;

    public static BetaFeedbackCreatedResponse from(BetaFeedback feedback) {
        return BetaFeedbackCreatedResponse.builder()
                .id(feedback.getId())
                .status(feedback.getStatus().name())
                .createdAt(feedback.getCreatedAt())
                .build();
    }
}
