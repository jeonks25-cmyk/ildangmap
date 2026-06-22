package com.ildangmap.api.scheduleboard.dto;

import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ScheduleBoardPostListResponse {

    private List<ScheduleBoardPostResponse> items;
    private String nextCursor;
}
