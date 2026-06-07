package com.ildangmap.api.job.briefing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BriefingPostCreateRequest {

    @NotBlank(message = "내용을 입력해 주세요.")
    @Size(max = 2000, message = "내용은 2000자 이하로 입력해 주세요.")
    private String body;

    /** general | change | help_request */
    private String postType;

    /** 단일 이미지 data URL (jpeg/png/webp), 선택 */
    @Size(max = 220_000, message = "첨부 이미지가 너무 큽니다.")
    private String imageDataUrl;
}
