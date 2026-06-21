package com.ildangmap.api.user;

import com.ildangmap.api.user.dto.MeResponse;
import com.ildangmap.api.user.dto.NicknameAvailabilityResponse;
import com.ildangmap.api.user.dto.NicknameSetRequest;
import com.ildangmap.global.api.ApiResponse;
import com.ildangmap.global.exception.UnauthorizedException;
import com.ildangmap.service.SessionUserService;
import com.ildangmap.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class NicknameController {

    private final UserService userService;
    private final SessionUserService sessionUserService;

    @GetMapping({"/users/nickname/availability", "/api/users/nickname/availability"})
    @Operation(summary = "닉네임 중복 확인")
    public ApiResponse<NicknameAvailabilityResponse> availability(
            @RequestParam("nickname") String nickname,
            Authentication authentication
    ) {
        Long excludeUserId = sessionUserService.resolveCurrentUserId().orElse(null);
        return ApiResponse.success(userService.checkNicknameAvailability(nickname, excludeUserId));
    }

    @PostMapping({"/users/me/nickname", "/api/users/me/nickname"})
    @Operation(summary = "닉네임 최초 설정")
    public ApiResponse<MeResponse> setNickname(
            @Valid @RequestBody NicknameSetRequest request,
            Authentication authentication
    ) {
        Long userId = requireUserId(authentication);
        return ApiResponse.success(userService.setInitialNickname(userId, request.getNickname()));
    }

    @PatchMapping({"/users/me/nickname", "/api/users/me/nickname"})
    @Operation(summary = "닉네임 변경")
    public ApiResponse<MeResponse> changeNickname(
            @Valid @RequestBody NicknameSetRequest request,
            Authentication authentication
    ) {
        Long userId = requireUserId(authentication);
        return ApiResponse.success(userService.changeNickname(userId, request.getNickname()));
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
