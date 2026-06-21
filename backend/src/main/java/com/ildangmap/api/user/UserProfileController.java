package com.ildangmap.api.user;

import com.ildangmap.api.user.dto.MeResponse;
import com.ildangmap.api.user.dto.ProfileUpdateRequest;
import com.ildangmap.global.api.ApiResponse;
import com.ildangmap.global.exception.UnauthorizedException;
import com.ildangmap.service.SessionUserService;
import com.ildangmap.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequiredArgsConstructor
public class UserProfileController {

    private final UserService userService;
    private final SessionUserService sessionUserService;

    @PatchMapping({"/users/me/profile", "/api/users/me/profile"})
    @Operation(summary = "내 프로필 상세 저장", description = "활동지역·공종·경력·희망일당·출생년도 등을 DB에 저장합니다.")
    public ApiResponse<MeResponse> updateProfile(
            @Valid @RequestBody ProfileUpdateRequest request,
            Authentication authentication
    ) {
        Long userId = requireUserId(authentication);
        return ApiResponse.success("프로필을 저장했습니다.", userService.updateProfileDetails(userId, request));
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
