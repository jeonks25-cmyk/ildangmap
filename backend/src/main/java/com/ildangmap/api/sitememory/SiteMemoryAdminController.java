package com.ildangmap.api.sitememory;

import com.ildangmap.api.sitememory.dto.SiteMemoryBackfillResponse;
import com.ildangmap.global.api.ApiResponse;
import com.ildangmap.global.exception.UnauthorizedException;
import com.ildangmap.service.AdminAuthService;
import com.ildangmap.service.SessionUserService;
import com.ildangmap.service.sitememory.SiteMemoryBackfillService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/site-memory")
@RequiredArgsConstructor
public class SiteMemoryAdminController {

    private final SiteMemoryBackfillService backfillService;
    private final AdminAuthService adminAuthService;
    private final SessionUserService sessionUserService;

    @PostMapping("/rebuild")
    @Operation(summary = "일정 데이터 → 공용 현장 사전 백필 (관리자)")
    public ApiResponse<SiteMemoryBackfillResponse> rebuild(
            @RequestParam(value = "force", defaultValue = "false") boolean force,
            Authentication authentication
    ) {
        Long userId = requireUserId(authentication);
        adminAuthService.requireAdmin(userId);
        return ApiResponse.success(backfillService.rebuildFromSchedules(force));
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
