package com.ildangmap.api.feedback;

import com.ildangmap.api.feedback.dto.AdminAccessResponse;
import com.ildangmap.api.feedback.dto.BetaFeedbackAdminItemResponse;
import com.ildangmap.api.feedback.dto.BetaFeedbackAdminListResponse;
import com.ildangmap.api.feedback.dto.BetaFeedbackStatusUpdateRequest;
import com.ildangmap.domain.feedback.BetaFeedback;
import com.ildangmap.domain.feedback.BetaFeedbackSeverity;
import com.ildangmap.domain.feedback.BetaFeedbackStatus;
import com.ildangmap.global.api.ApiResponse;
import com.ildangmap.global.exception.UnauthorizedException;
import com.ildangmap.service.AdminAuthService;
import com.ildangmap.service.SessionUserService;
import com.ildangmap.service.feedback.BetaFeedbackService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/feedback/admin")
@RequiredArgsConstructor
public class BetaFeedbackAdminController {

    private final BetaFeedbackService feedbackService;
    private final SessionUserService sessionUserService;
    private final AdminAuthService adminAuthService;

    @GetMapping("/access")
    @Operation(summary = "관리자 접근 권한 확인")
    public ApiResponse<AdminAccessResponse> access(Authentication authentication) {
        Long userId = resolveUserIdOrNull(authentication);
        return ApiResponse.success(AdminAccessResponse.of(adminAuthService.isAdmin(userId)));
    }

    @GetMapping
    @Operation(summary = "베타 피드백 목록 (관리자)")
    public ApiResponse<BetaFeedbackAdminListResponse> list(
            @RequestParam(value = "status", required = false) BetaFeedbackStatus status,
            @RequestParam(value = "severity", required = false) BetaFeedbackSeverity severity,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            Authentication authentication
    ) {
        Long userId = requireUserId(authentication);
        adminAuthService.requireAdmin(userId);

        Page<BetaFeedback> result = feedbackService.listForAdmin(status, severity, page, size);
        List<BetaFeedbackAdminItemResponse> items = result.getContent().stream()
                .map(feedback -> BetaFeedbackAdminItemResponse.from(feedback, feedbackService.countSimilar(feedback)))
                .toList();

        List<BetaFeedbackAdminListResponse.SimilarGroupSummary> topGroups = feedbackService.topSimilarGroups().stream()
                .limit(10)
                .map(row -> BetaFeedbackAdminListResponse.SimilarGroupSummary.builder()
                        .similarityGroupKey(row.getGroupKey())
                        .count(row.getCnt())
                        .build())
                .toList();

        return ApiResponse.success(BetaFeedbackAdminListResponse.builder()
                .items(items)
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .topSimilarGroups(topGroups)
                .build());
    }

    @GetMapping("/{feedbackId}")
    @Operation(summary = "베타 피드백 상세 (관리자)")
    public ApiResponse<BetaFeedbackAdminItemResponse> detail(
            @PathVariable Long feedbackId,
            Authentication authentication
    ) {
        Long userId = requireUserId(authentication);
        adminAuthService.requireAdmin(userId);
        BetaFeedback feedback = feedbackService.getForAdmin(feedbackId);
        return ApiResponse.success(BetaFeedbackAdminItemResponse.from(feedback, feedbackService.countSimilar(feedback)));
    }

    @PatchMapping("/{feedbackId}/status")
    @Operation(summary = "베타 피드백 상태 변경 (관리자)")
    public ApiResponse<BetaFeedbackAdminItemResponse> updateStatus(
            @PathVariable Long feedbackId,
            @Valid @RequestBody BetaFeedbackStatusUpdateRequest request,
            Authentication authentication
    ) {
        Long userId = requireUserId(authentication);
        adminAuthService.requireAdmin(userId);
        BetaFeedback feedback = feedbackService.updateStatus(feedbackId, request.getStatus());
        return ApiResponse.success(BetaFeedbackAdminItemResponse.from(feedback, feedbackService.countSimilar(feedback)));
    }

    private Long resolveUserIdOrNull(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof OAuth2User)) {
            return null;
        }
        return sessionUserService.resolveCurrentUserId().orElse(null);
    }

    private Long requireUserId(Authentication authentication) {
        Long userId = resolveUserIdOrNull(authentication);
        if (userId == null) {
            throw new UnauthorizedException("로그인이 필요합니다.");
        }
        return userId;
    }
}
