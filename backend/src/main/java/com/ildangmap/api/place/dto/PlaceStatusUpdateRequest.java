package com.ildangmap.api.place.dto;

import com.ildangmap.domain.place.PlaceStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class PlaceStatusUpdateRequest {

    @NotNull
    private PlaceStatus status;
}
