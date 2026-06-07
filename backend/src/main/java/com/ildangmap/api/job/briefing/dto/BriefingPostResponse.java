package com.ildangmap.api.job.briefing.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BriefingPostResponse {

    private Long id;
    private String body;
    private String postType;
    private Long authorUserId;
    private String authorName;
    private Instant createdAt;
    /** data URL 또는 null — MVP 1장 제한 */
    private String imageDataUrl;
}
