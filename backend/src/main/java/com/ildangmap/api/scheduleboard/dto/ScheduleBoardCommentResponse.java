package com.ildangmap.api.scheduleboard.dto;

import java.time.Instant;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ScheduleBoardCommentResponse {

    private Long id;
    private Long postId;
    private Long authorUserId;
    private String authorName;
    private String body;
    private Instant createdAt;
    private Instant updatedAt;
}
