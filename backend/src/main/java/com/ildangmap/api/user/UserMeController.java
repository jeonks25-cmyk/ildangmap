package com.ildangmap.api.user;

import com.ildangmap.api.user.dto.MeResponse;
import com.ildangmap.global.api.ApiResponse;
import com.ildangmap.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequiredArgsConstructor
public class UserMeController {

    private final UserService userService;

    @GetMapping({"/api/me", "/users/me", "/api/users/me"})
    @Operation(summary = "현재 로그인 사용자", description = "세션 기반 OAuth2 로그인 사용자 정보를 반환합니다. 비로그인 시 data는 null입니다.")
    public ApiResponse<MeResponse> me(Authentication authentication, HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        boolean hasCookieHeader = request.getHeader("Cookie") != null && !request.getHeader("Cookie").isBlank();
        boolean authenticated = authentication != null && authentication.isAuthenticated();
        String principalType =
                authentication != null && authentication.getPrincipal() != null
                        ? authentication.getPrincipal().getClass().getSimpleName()
                        : "null";

        log.info(
                "[/api/users/me] host={} forwardedHost={} sessionId={} hasCookieHeader={} hasSessionCookie={} authenticated={} principalType={}",
                request.getServerName(),
                request.getHeader("X-Forwarded-Host"),
                session != null ? session.getId() : "none",
                hasCookieHeader,
                hasCookieHeader && request.getHeader("Cookie").contains("ILDANGMAPSESSION"),
                authenticated,
                principalType);

        if (!authenticated) {
            log.info("[/api/users/me] response data=null (not authenticated)");
            return ApiResponse.success(null);
        }

        Object principal = authentication.getPrincipal();
        if (!(principal instanceof OAuth2User oauth2User)) {
            log.warn("[/api/users/me] response data=null (principal is not OAuth2User: {})", principalType);
            return ApiResponse.success(null);
        }

        MeResponse data = userService.getMeForOAuth2User(oauth2User);
        if (data == null) {
            log.warn(
                    "[/api/users/me] response data=null (OAuth2User present but DB user not found) attributes={}",
                    oauth2User.getAttributes().keySet());
        } else {
            log.info(
                    "[/api/users/me] response data id={} userType={} nicknameSetupRequired={}",
                    data.getId(),
                    data.getUserType(),
                    data.isNicknameSetupRequired());
        }
        return ApiResponse.success(data);
    }
}
