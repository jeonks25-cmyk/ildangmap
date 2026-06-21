package com.ildangmap.api.place.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class PlaceVerifyRequest {

    @NotBlank
    @Pattern(regexp = "correct|incorrect", flags = Pattern.Flag.CASE_INSENSITIVE)
    private String vote;
}
