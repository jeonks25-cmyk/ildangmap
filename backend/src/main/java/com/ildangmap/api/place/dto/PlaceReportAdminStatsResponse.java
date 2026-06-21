package com.ildangmap.api.place.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PlaceReportAdminStatsResponse {
    private final long totalPlaces;
    private final long pendingReview;
    private final long hidden;
    private final long deleteCandidate;
}
