package com.ildangmap.api.feedback.dto;

import com.ildangmap.domain.feedback.BetaFeedbackStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BetaFeedbackStatusUpdateRequest {

    @NotNull
    private BetaFeedbackStatus status;
}
