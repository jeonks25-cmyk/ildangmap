package com.ildangmap.api.user.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class ProfileUpdateRequest {

    @Min(1940)
    @Max(2015)
    private Integer birthYear;

    @Size(max = 30)
    private String craft;

    @Min(0)
    @Max(60)
    private Integer experienceYears;

    @Min(1)
    @Max(999)
    private Integer desiredPay;

    @Size(max = 10)
    private List<@Size(max = 20) String> regions;

    @Size(max = 30)
    private String phone;

    @Size(max = 200)
    private String intro;

    @Size(max = 80)
    private String businessName;

    @Size(max = 40)
    private String jobTitle;

    @Size(max = 40)
    private String kakaoTalkId;

    @Size(max = 255)
    private String blogUrl;

    @Size(max = 255)
    private String instagramUrl;

    @Size(max = 255)
    private String homepageUrl;

    @Size(max = 220000)
    private String portfolioImageUrl;

    @Size(max = 12)
    private String businessRegNo;
}
