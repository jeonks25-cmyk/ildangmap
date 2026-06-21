package com.ildangmap.api.place.dto;

import com.ildangmap.domain.place.MapPlace;
import com.ildangmap.domain.place.PlaceStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class PlaceReportAdminItemResponse {
    private final String placeId;
    private final String title;
    private final PlaceStatus status;
    private final int reportCount;
    private final int correctCount;
    private final int incorrectCount;
    private final String latestReason;
    private final LocalDateTime lastReportAt;

    public static PlaceReportAdminItemResponse of(MapPlace place, String latestReason) {
        return PlaceReportAdminItemResponse.builder()
                .placeId(place.getExternalId())
                .title(place.getTitle())
                .status(place.getStatus())
                .reportCount(place.getReportCount())
                .correctCount(place.getCorrectCount())
                .incorrectCount(place.getIncorrectCount())
                .latestReason(latestReason != null ? latestReason : "—")
                .lastReportAt(place.getLastReportAt())
                .build();
    }
}
