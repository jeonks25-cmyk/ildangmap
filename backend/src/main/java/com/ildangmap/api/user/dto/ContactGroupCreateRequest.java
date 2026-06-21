package com.ildangmap.api.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ContactGroupCreateRequest {

    @NotBlank
    @Size(max = 40)
    private String name;

    @Size(max = 40)
    private String tradeHint;
}
