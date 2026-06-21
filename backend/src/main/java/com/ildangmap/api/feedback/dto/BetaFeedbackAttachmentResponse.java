package com.ildangmap.api.feedback.dto;

import com.ildangmap.domain.feedback.BetaFeedbackAttachment;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class BetaFeedbackAttachmentResponse {

    private final Long id;
    private final String fileName;
    private final String contentType;
    private final long fileSize;
    private final String url;

    public static BetaFeedbackAttachmentResponse from(BetaFeedbackAttachment attachment) {
        return BetaFeedbackAttachmentResponse.builder()
                .id(attachment.getId())
                .fileName(attachment.getFileName())
                .contentType(attachment.getContentType())
                .fileSize(attachment.getFileSize())
                .url("/api/feedback/attachments/" + attachment.getId())
                .build();
    }
}
