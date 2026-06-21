package com.ildangmap.api.place.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class PlaceReportAdminListResponse {
    private final PlaceReportAdminStatsResponse stats;
    private final List<PlaceReportAdminItemResponse> items;
}
