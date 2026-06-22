package com.ildangmap.api.scheduleboard.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ScheduleBoardPostCreateRequest {

    private String postType;

    @Size(max = 2000)
    private String body;

    private String briefingId;

    /** MVP: base64 data URLs (작업사진 N장) */
    private List<String> imageDataUrls = new ArrayList<>();

    /** 레거시 단일 이미지 */
    private String imageDataUrl;

    private List<MentionDto> mentions = new ArrayList<>();
}
