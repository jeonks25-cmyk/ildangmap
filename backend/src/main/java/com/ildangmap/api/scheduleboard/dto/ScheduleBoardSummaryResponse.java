package com.ildangmap.api.scheduleboard.dto;

import java.time.Instant;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ScheduleBoardSummaryResponse {

    private String scheduleId;
    private int unreadNoticeCount;
    private int unreadPostCount;
    private int unreadTotalCount;
    private Instant lastPostAt;
}
