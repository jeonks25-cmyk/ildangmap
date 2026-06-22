package com.ildangmap.api.scheduleboard.dto;

import java.time.Instant;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ScheduleBoardNotificationEventResponse {

    private Long id;
    private String eventType;
    private String scheduleId;
    private String briefingId;
    private Long postId;
    private Long commentId;
    private Long actorUserId;
    private String actorName;
    private String preview;
    private Instant createdAt;
}
