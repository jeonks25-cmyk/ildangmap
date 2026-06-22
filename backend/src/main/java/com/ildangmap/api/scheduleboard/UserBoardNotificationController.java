package com.ildangmap.api.scheduleboard;

import com.ildangmap.api.scheduleboard.dto.ScheduleBoardNotificationEventResponse;
import com.ildangmap.global.api.ApiResponse;
import com.ildangmap.global.exception.UnauthorizedException;
import com.ildangmap.service.ScheduleBoardService;
import com.ildangmap.service.SessionUserService;
import io.swagger.v3.oas.annotations.Operation;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class UserBoardNotificationController {

    private final ScheduleBoardService scheduleBoardService;
    private final SessionUserService sessionUserService;

    @GetMapping({"/users/me/board-notifications", "/api/users/me/board-notifications"})
    @Operation(summary = "미전달 게시판 알림 (계정 동기화)")
    public ApiResponse<List<ScheduleBoardNotificationEventResponse>> pendingNotifications(
            Authentication authentication) {
        Long userId = requireUserId(authentication);
        return ApiResponse.success(scheduleBoardService.pullUndeliveredNotifications(userId));
    }

    @PostMapping({"/users/me/board-notifications/delivered", "/api/users/me/board-notifications/delivered"})
    @Operation(summary = "게시판 알림 전달 완료 표시")
    public ApiResponse<Map<String, Object>> markNotificationsDelivered(
            @RequestBody Map<String, List<Long>> body, Authentication authentication) {
        Long userId = requireUserId(authentication);
        List<Long> ids = body != null ? body.get("ids") : List.of();
        scheduleBoardService.markNotificationsDelivered(userId, ids);
        return ApiResponse.success(Map.of("delivered", ids != null ? ids.size() : 0));
    }

    private Long requireUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedException("로그인이 필요합니다.");
        }
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof OAuth2User)) {
            throw new UnauthorizedException("로그인이 필요합니다.");
        }
        return sessionUserService
                .resolveCurrentUserId()
                .orElseThrow(() -> new UnauthorizedException("로그인이 필요합니다."));
    }
}
