package com.ildangmap.api.feedback.dto;

import com.ildangmap.domain.feedback.BetaFeedback;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class BetaFeedbackAdminItemResponse {

    private final Long id;
    private final Long userId;
    private final String displayNickname;
    private final String userType;
    private final String category;
    private final String severity;
    private final String status;
    private final String inconvenient;
    private final String featureRequest;
    private final String otherComment;
    private final long similarCount;
    private final String similarityGroupKey;
    private final LocalDateTime createdAt;
    private final List<BetaFeedbackAttachmentResponse> attachments;

    public static BetaFeedbackAdminItemResponse from(BetaFeedback feedback, long similarCount) {
        return BetaFeedbackAdminItemResponse.builder()
                .id(feedback.getId())
                .userId(feedback.getUserId())
                .displayNickname(feedback.getDisplayNickname())
                .userType(feedback.getUserType().name())
                .category(feedback.getCategory().name())
                .severity(feedback.getSeverity().name())
                .status(feedback.getStatus().name())
                .inconvenient(feedback.getInconvenient())
                .featureRequest(feedback.getFeatureRequest())
                .otherComment(feedback.getOtherComment())
                .similarCount(similarCount)
                .similarityGroupKey(feedback.getSimilarityGroupKey())
                .createdAt(feedback.getCreatedAt())
                .attachments(feedback.getAttachments().stream().map(BetaFeedbackAttachmentResponse::from).toList())
                .build();
    }
}
