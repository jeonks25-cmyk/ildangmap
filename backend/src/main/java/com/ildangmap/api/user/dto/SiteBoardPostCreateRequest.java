package com.ildangmap.api.user.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SiteBoardPostCreateRequest {

    @Size(max = 2000)
    private String body;

    @Size(max = 24)
    private String postType;

    @Size(max = 220000)
    private String imageDataUrl;
}
