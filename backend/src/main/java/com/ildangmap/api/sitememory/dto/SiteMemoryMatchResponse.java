package com.ildangmap.api.sitememory.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class SiteMemoryMatchResponse {

    private final List<SiteMemoryCandidateResponse> candidates;
    private final int total;
}
