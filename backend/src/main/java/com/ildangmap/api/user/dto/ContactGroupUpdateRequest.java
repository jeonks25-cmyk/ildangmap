package com.ildangmap.api.user.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ContactGroupUpdateRequest {

    @Size(max = 40)
    private String name;

    @Size(max = 40)
    private String tradeHint;
}
