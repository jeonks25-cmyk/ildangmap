package com.ildangmap.api.place.dto;

import com.ildangmap.domain.place.MapPlace;
import com.ildangmap.domain.place.PlaceStatus;
import com.ildangmap.domain.place.VerifyVoteType;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class PlaceModerationResponse {
    private final String placeId;
    private final String title;
    private final PlaceStatus status;
    private final int reportCount;
    private final int correctCount;
    private final int incorrectCount;
    private final String myVerifyVote;
    private final LocalDateTime lastReportAt;

    public static PlaceModerationResponse from(MapPlace place, VerifyVoteType myVote) {
        return PlaceModerationResponse.builder()
                .placeId(place.getExternalId())
                .title(place.getTitle())
                .status(place.getStatus())
                .reportCount(place.getReportCount())
                .correctCount(place.getCorrectCount())
                .incorrectCount(place.getIncorrectCount())
                .myVerifyVote(myVote != null ? myVote.name().toLowerCase() : null)
                .lastReportAt(place.getLastReportAt())
                .build();
    }
}
