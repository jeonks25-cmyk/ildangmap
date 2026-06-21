package com.ildangmap.api.feedback.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AdminAccessResponse {

    private final boolean admin;

    public static AdminAccessResponse of(boolean admin) {
        return AdminAccessResponse.builder().admin(admin).build();
    }
}
