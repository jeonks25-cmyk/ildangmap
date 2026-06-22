package com.ildangmap.api.sitememory;

import com.ildangmap.api.sitememory.dto.SiteMemoryEventCreateRequest;
import com.ildangmap.api.sitememory.dto.SiteMemoryEventCreateResponse;
import com.ildangmap.api.sitememory.dto.SiteMemoryMatchResponse;
import com.ildangmap.global.api.ApiResponse;
import com.ildangmap.global.exception.UnauthorizedException;
import com.ildangmap.service.SessionUserService;
import com.ildangmap.service.sitememory.SiteMemoryService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/site-memory")
@RequiredArgsConstructor
public class SiteMemoryController {

    private final SiteMemoryService siteMemoryService;
    private final SessionUserService sessionUserService;

    @GetMapping("/match")
    @Operation(summary = "공용 현장 Memory 매칭", description = "전체 사용자 등록 빈도 기반 OCR 후보")
    public ApiResponse<SiteMemoryMatchResponse> match(
            @RequestParam("q") String query,
            @RequestParam(value = "building", required = false) String building,
            @RequestParam(value = "region", required = false) String region,
            @RequestParam(value = "craft", required = false) String craft,
            @RequestParam(value = "limit", defaultValue = "5") int limit,
            Authentication authentication
    ) {
        requireUserId(authentication);
        return ApiResponse.success(siteMemoryService.match(query, building, region, craft, limit));
    }

    @PostMapping("/events")
    @Operation(summary = "현장 Memory 이벤트 기록", description = "등록·OCR 결과 — Analytics 기반 데이터")
    public ApiResponse<SiteMemoryEventCreateResponse> recordEvent(
            @Valid @RequestBody SiteMemoryEventCreateRequest request,
            Authentication authentication
    ) {
        Long userId = requireUserId(authentication);
        return ApiResponse.success(siteMemoryService.recordEvent(userId, request));
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
