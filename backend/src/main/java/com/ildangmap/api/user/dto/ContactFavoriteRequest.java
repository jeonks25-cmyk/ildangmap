package com.ildangmap.api.user.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ContactFavoriteRequest {

    @NotNull
    private Boolean favorite;
}
