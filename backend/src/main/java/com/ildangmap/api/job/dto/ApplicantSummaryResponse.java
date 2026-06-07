package com.ildangmap.api.job.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ApplicantSummaryResponse {

    private Long id;
    private String name;
    private String role;
    private String status;
    private String workerId;
}
