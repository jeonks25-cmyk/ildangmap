package com.ildangmap.api.job.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class JobCreateRequest {

    @NotBlank
    private String title;

    private BigDecimal payAmount;
    private String pay;

    @NotNull
    private Double lat;

    @NotNull
    private Double lng;

    private String craft;
    private String trade;
    private String role;

    private String address;
    private String shortAddress;
    private String location;
    private String locationText;
    private String fullAddress;

    private LocalDate workDate;
    private String workType;
    private String workTime;

    private Boolean urgent;
    private Long ownerUserId;
    private BigDecimal distanceKm;
}
