package com.ildangmap.api.siteimport;

import com.ildangmap.api.siteimport.dto.SiteImportStructureRequest;
import com.ildangmap.api.siteimport.dto.SiteImportStructureResponse;
import com.ildangmap.global.api.ApiResponse;
import com.ildangmap.service.SiteImportStructureService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class SiteImportStructureController {

    private final SiteImportStructureService siteImportStructureService;

    @PostMapping({"/site-import/structure", "/api/site-import/structure"})
    @Operation(summary = "OCR 텍스트 GPT/규칙 구조화", description = "현장 일정 필드 JSON 변환")
    public ApiResponse<SiteImportStructureResponse> structure(@Valid @RequestBody SiteImportStructureRequest request) {
        return ApiResponse.success(siteImportStructureService.structure(request));
    }
}
