package com.ildangmap.api.siteimport;

import com.ildangmap.api.siteimport.dto.SiteImportStructureResponse;
import com.ildangmap.global.api.ApiResponse;
import com.ildangmap.service.SiteImportVisionParseService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@RestController
@RequiredArgsConstructor
public class SiteImportVisionParseController {

    private final SiteImportVisionParseService siteImportVisionParseService;

    @PostMapping(
            value = {"/site-import/vision-parse", "/api/site-import/vision-parse"},
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "카카오톡 캡처 Vision OCR", description = "Gemini Vision으로 현장 일정 필드 추출")
    public ApiResponse<SiteImportStructureResponse> visionParse(@RequestParam("image") MultipartFile image)
            throws Exception {
        log.info(
                "[VISION-OCR] endpoint hit fileName={} size={} contentType={}",
                image != null ? image.getOriginalFilename() : null,
                image != null ? image.getSize() : 0,
                image != null ? image.getContentType() : null);
        SiteImportStructureResponse result = siteImportVisionParseService.parse(image);
        return ApiResponse.success("Vision OCR 완료", result);
    }
}
