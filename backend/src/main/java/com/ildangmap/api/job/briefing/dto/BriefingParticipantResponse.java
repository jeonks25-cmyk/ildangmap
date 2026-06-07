package com.ildangmap.api.job.briefing.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BriefingParticipantResponse {

    private Long userId;
    private String displayName;
    private String roleTag;
}
