package com.ildangmap.api.job.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ApplyJobResponse {

    private Long jobId;
    private Long applicantId;
    private String status;
    private int currentApplicantCount;
    private int maxApplicantCount;
    private boolean autoClosed;
    private JobSummaryResponse job;
}
