package com.ildangmap.api.place;

import com.ildangmap.api.place.dto.PlaceModerationResponse;
import com.ildangmap.api.place.dto.PlaceReportCreateRequest;
import com.ildangmap.api.place.dto.PlaceVerifyRequest;
import com.ildangmap.domain.place.VerifyVoteType;
import com.ildangmap.global.api.ApiResponse;
import com.ildangmap.global.exception.BadRequestException;
import com.ildangmap.global.exception.UnauthorizedException;
import com.ildangmap.service.SessionUserService;
import com.ildangmap.service.place.PlaceModerationService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/places")
@RequiredArgsConstructor
public class PlaceModerationController {

    private final PlaceModerationService placeModerationService;
    private final SessionUserService sessionUserService;

    @PostMapping("/{placeId}/reports")
    @Operation(summary = "장소 신고 접수")
    public ApiResponse<PlaceModerationResponse> report(
            @PathVariable String placeId,
            @Valid @RequestBody PlaceReportCreateRequest request,
            Authentication authentication
    ) {
        Long reporterId = requireUserId(authentication);
        PlaceModerationResponse response = placeModerationService.submitReport(
                placeId,
                reporterId,
                request.getReason(),
                request.getTitle()
        );
        return ApiResponse.success("신고가 접수되었습니다.", response);
    }

    @PostMapping("/{placeId}/verify")
    @Operation(summary = "장소 정보 검증 투표")
    public ApiResponse<PlaceModerationResponse> verify(
            @PathVariable String placeId,
            @Valid @RequestBody PlaceVerifyRequest request,
            Authentication authentication
    ) {
        Long voterId = requireUserId(authentication);
        VerifyVoteType vote = parseVote(request.getVote());
        PlaceModerationResponse response = placeModerationService.submitVerify(
                placeId,
                voterId,
                vote,
                null
        );
        return ApiResponse.success(response);
    }

    @GetMapping("/{placeId}/moderation")
    @Operation(summary = "장소 검수·신고 현황 조회")
    public ApiResponse<PlaceModerationResponse> moderation(
            @PathVariable String placeId,
            Authentication authentication
    ) {
        Long viewerId = resolveUserIdOrNull(authentication);
        return ApiResponse.success(placeModerationService.getModeration(placeId, viewerId));
    }

    @GetMapping("/moderation/status-index")
    @Operation(summary = "지도 숨김·검수 상태 인덱스")
    public ApiResponse<Map<String, String>> statusIndex() {
        Map<String, String> statuses = new LinkedHashMap<>();
        placeModerationService.listNonPublicStatuses().forEach((id, status) -> statuses.put(id, status.name()));
        return ApiResponse.success(statuses);
    }

    private VerifyVoteType parseVote(String raw) {
        if (raw == null) {
            throw new BadRequestException("투표 값이 필요합니다.");
        }
        return switch (raw.trim().toLowerCase()) {
            case "correct" -> VerifyVoteType.CORRECT;
            case "incorrect", "wrong" -> VerifyVoteType.INCORRECT;
            default -> throw new BadRequestException("투표 값은 correct 또는 incorrect 여야 합니다.");
        };
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
