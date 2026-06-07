package com.ildangmap.api.user;

import com.ildangmap.api.user.dto.MeResponse;
import com.ildangmap.global.api.ApiResponse;
import com.ildangmap.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class UserMeController {

    private final UserService userService;

    @GetMapping({"/api/me", "/users/me"})
    @Operation(summary = "현재 로그인 사용자", description = "세션 기반 OAuth2 로그인 사용자 정보를 반환합니다. 비로그인 시 data는 null입니다.")
    public ApiResponse<MeResponse> me(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ApiResponse.success(null);
        }
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof OAuth2User oauth2User)) {
            return ApiResponse.success(null);
        }
        return ApiResponse.success(userService.getMeForOAuth2User(oauth2User));
    }
}
