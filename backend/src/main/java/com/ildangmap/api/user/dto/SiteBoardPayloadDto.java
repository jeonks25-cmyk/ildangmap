package com.ildangmap.api.user.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.HashMap;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SiteBoardPayloadDto {

    /** briefingId → { posts, commentsByPostId } */
    @Builder.Default
    private Map<String, Map<String, Object>> boardsByBriefingId = new HashMap<>();

    public static SiteBoardPayloadDto empty() {
        return SiteBoardPayloadDto.builder().build();
    }

    public boolean hasAnyData() {
        return boardsByBriefingId != null && !boardsByBriefingId.isEmpty();
    }
}
