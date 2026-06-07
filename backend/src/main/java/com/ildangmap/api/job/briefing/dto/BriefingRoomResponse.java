package com.ildangmap.api.job.briefing.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BriefingRoomResponse {

    private Long jobId;
    private String title;
    private LocalDate workDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String shortAddress;
    private String fullAddress;
    private Double lat;
    private Double lng;
    private boolean parkingAvailable;
    private String trade;
    private String role;
    /** 출입·집결(방 메모 우선, 없으면 공고 보조) */
    private String entryInfo;
    /** 주차 안내 */
    private String parkingInfo;
    /** 작업 내용 요약 */
    private String workSummary;
    private List<BriefingParticipantResponse> participants;
}
