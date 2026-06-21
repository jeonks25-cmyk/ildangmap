package com.ildangmap.api.place;

import com.ildangmap.api.place.dto.PlaceModerationResponse;
import com.ildangmap.api.place.dto.PlaceReportAdminListResponse;
import com.ildangmap.api.place.dto.PlaceStatusUpdateRequest;
import com.ildangmap.global.api.ApiResponse;
import com.ildangmap.global.exception.UnauthorizedException;
import com.ildangmap.service.AdminAuthService;
import com.ildangmap.service.SessionUserService;
import com.ildangmap.service.place.PlaceModerationService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class PlaceReportAdminController {

    private final PlaceModerationService placeModerationService;
    private final SessionUserService sessionUserService;
    private final AdminAuthService adminAuthService;

    @GetMapping("/place-reports")
    @Operation(summary = "장소 신고·검수 목록 (관리자)")
    public ApiResponse<PlaceReportAdminListResponse> list(
            @RequestParam(value = "sort", defaultValue = "reports") String sort,
            Authentication authentication
    ) {
        Long userId = requireUserId(authentication);
        adminAuthService.requireAdmin(userId);
        return ApiResponse.success(placeModerationService.listForAdmin(sort));
    }

    @PatchMapping("/places/{placeId}/status")
    @Operation(summary = "장소 검수 상태 변경 (관리자)")
    public ApiResponse<PlaceModerationResponse> updateStatus(
            @PathVariable String placeId,
            @Valid @RequestBody PlaceStatusUpdateRequest request,
            Authentication authentication
    ) {
        Long userId = requireUserId(authentication);
        adminAuthService.requireAdmin(userId);
        return ApiResponse.success(placeModerationService.updateStatusByAdmin(placeId, request.getStatus()));
    }

    @DeleteMapping("/places/{placeId}")
    @Operation(summary = "장소 삭제 처리 (관리자)")
    public ApiResponse<PlaceModerationResponse> delete(
            @PathVariable String placeId,
            Authentication authentication
    ) {
        Long userId = requireUserId(authentication);
        adminAuthService.requireAdmin(userId);
        return ApiResponse.success(placeModerationService.deleteByAdmin(placeId));
    }

    private Long requireUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedException("로그인이 필요합니다.");
        }
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof OAuth2User)) {
            throw new UnauthorizedException("로그인이 필요합니다.");
        }
        return sessionUserService.resolveCurrentUserId()
                .orElseThrow(() -> new UnauthorizedException("로그인이 필요합니다."));
    }
}
