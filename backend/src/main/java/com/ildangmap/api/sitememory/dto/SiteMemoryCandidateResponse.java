package com.ildangmap.api.sitememory.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SiteMemoryCandidateResponse {

    private final String name;
    private final String canonicalKey;
    private final long registrationCount;
    private final double score;
    private final int scorePercent;
    private final String region;
    private final String detail;
    private final String source;
}
