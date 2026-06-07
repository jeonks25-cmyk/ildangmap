package com.ildangmap.api.user.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NicknameAvailabilityResponse {

    private final String nickname;
    private final boolean available;
    private final String reason;
}
