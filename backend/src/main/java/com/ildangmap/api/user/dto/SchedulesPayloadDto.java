package com.ildangmap.api.user.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
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
public class SchedulesPayloadDto {

    @Builder.Default
    private List<Map<String, Object>> schedules = new ArrayList<>();

    /** changeHistory / changeRequests / participantResponses */
    @Builder.Default
    private Map<String, Object> fieldOps = new HashMap<>();

    public static SchedulesPayloadDto empty() {
        return SchedulesPayloadDto.builder().build();
    }

    public boolean hasAnyData() {
        return !schedules.isEmpty() || (fieldOps != null && !fieldOps.isEmpty());
    }
}
