package com.ildangmap.api.scheduleboard.dto;

import java.time.Instant;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ScheduleBoardPostResponse {

    private Long id;
    private String scheduleId;
    private String briefingId;
    private String postType;
    private String body;
    private Long authorUserId;
    private String authorName;
    private String authorImageUrl;
    private List<String> imageUrls;
    private String imageDataUrl;
    private int imageCount;
    private int commentCount;
    private boolean isRead;
    private Instant createdAt;
    private Instant updatedAt;
}
