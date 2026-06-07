package com.ildangmap.api.job.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class JobSummaryResponse {

    private Long id;
    private String title;
    private String pay;
    private Double lat;
    private Double lng;
    private String craft;
    private String address;
    private Boolean urgent;

    private String shortAddress;
    private String fullAddress;
    private BigDecimal payAmount;
    private String trade;
    private String workType;
    private String status;
    private BigDecimal distanceKm;
    private Boolean isUrgent;
    private LocalDate workDate;

    private List<ApplicantSummaryResponse> applicants;
    private Integer currentApplicantCount;
    private Integer maxApplicantCount;
    private Boolean liveHelp;
    private Long ownerUserId;
}
