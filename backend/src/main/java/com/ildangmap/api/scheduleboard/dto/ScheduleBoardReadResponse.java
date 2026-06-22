package com.ildangmap.api.scheduleboard.dto;

import java.time.Instant;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ScheduleBoardReadResponse {

    private Long postId;
    private Instant readAt;
}
