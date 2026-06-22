package com.ildangmap.api.admin;

import com.ildangmap.api.admin.dto.OcrAnalyticsSummaryResponse;
import com.ildangmap.api.feedback.dto.AdminAccessResponse;
import com.ildangmap.global.api.ApiResponse;
import com.ildangmap.global.exception.UnauthorizedException;
import com.ildangmap.service.AdminAuthService;
import com.ildangmap.service.SessionUserService;
import com.ildangmap.service.analytics.OcrAnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/analytics")
@RequiredArgsConstructor
public class OcrAnalyticsAdminController {

    private final OcrAnalyticsService ocrAnalyticsService;
    private final AdminAuthService adminAuthService;
    private final SessionUserService sessionUserService;

    @GetMapping("/access")
    @Operation(summary = "OCR Analytics 관리자 접근 확인")
    public ApiResponse<AdminAccessResponse> access(Authentication authentication) {
        Long userId = resolveUserIdOrNull(authentication);
        return ApiResponse.success(AdminAccessResponse.of(adminAuthService.isAdmin(userId)));
    }

    @GetMapping("/ocr")
    @Operation(summary = "OCR KPI 요약 (Vision / Tesseract / 수정률)")
    public ApiResponse<OcrAnalyticsSummaryResponse> ocrSummary(
            @RequestParam(value = "days", defaultValue = "30") int days, Authentication authentication) {
        Long userId = requireUserId(authentication);
        adminAuthService.requireAdmin(userId);
        return ApiResponse.success(ocrAnalyticsService.getSummary(days));
    }

    private Long resolveUserIdOrNull(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) return null;
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof OAuth2User)) return null;
        return sessionUserService.resolveCurrentUserId().orElse(null);
    }

    private Long requireUserId(Authentication authentication) {
        Long userId = resolveUserIdOrNull(authentication);
        if (userId == null) {
            throw new UnauthorizedException("login_required");
        }
        return userId;
    }
}
