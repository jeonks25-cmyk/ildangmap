package com.ildangmap.api.user;

import com.ildangmap.api.user.dto.SchedulesPayloadDto;
import com.ildangmap.global.api.ApiResponse;
import com.ildangmap.global.exception.UnauthorizedException;
import com.ildangmap.service.SessionUserService;
import com.ildangmap.service.UserSchedulesService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class UserSchedulesController {

    private final UserSchedulesService userSchedulesService;
    private final SessionUserService sessionUserService;

    @GetMapping({"/users/me/schedules", "/api/users/me/schedules"})
    @Operation(summary = "내 일정 조회", description = "계정에 저장된 현장 일정·참여자·변경 이력 스냅샷을 반환합니다.")
    public ApiResponse<SchedulesPayloadDto> getSchedules(Authentication authentication) {
        Long userId = requireUserId(authentication);
        return ApiResponse.success(userSchedulesService.getSchedules(userId));
    }

    @PutMapping({"/users/me/schedules", "/api/users/me/schedules"})
    @Operation(summary = "내 일정 저장", description = "계정 일정 스냅샷 전체를 저장합니다.")
    public ApiResponse<SchedulesPayloadDto> saveSchedules(
            @Valid @RequestBody SchedulesPayloadDto request,
            Authentication authentication
    ) {
        Long userId = requireUserId(authentication);
        return ApiResponse.success("일정을 저장했습니다.", userSchedulesService.saveSchedules(userId, request));
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
