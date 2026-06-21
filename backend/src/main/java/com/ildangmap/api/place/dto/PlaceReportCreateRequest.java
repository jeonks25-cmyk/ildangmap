package com.ildangmap.api.place.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class PlaceReportCreateRequest {

    @NotBlank
    @Size(max = 120)
    private String reason;

    @Size(max = 200)
    private String title;
}
