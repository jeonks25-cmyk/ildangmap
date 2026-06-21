package com.ildangmap.api.user.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ContactMemoRequest {

    @Size(max = 500)
    private String memo;
}
