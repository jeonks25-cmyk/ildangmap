package com.ildangmap.api.scheduleboard.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ScheduleBoardCommentCreateRequest {

    @NotBlank
    @Size(max = 500)
    private String body;

    private List<MentionDto> mentions = new ArrayList<>();
}
