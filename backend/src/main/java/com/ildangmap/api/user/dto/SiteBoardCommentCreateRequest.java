package com.ildangmap.api.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SiteBoardCommentCreateRequest {

    @NotBlank
    @Size(max = 500)
    private String body;
}
