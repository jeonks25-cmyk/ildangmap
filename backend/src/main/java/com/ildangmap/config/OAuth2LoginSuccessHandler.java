package com.ildangmap.config;

import com.ildangmap.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserService userService;

    @Value("${app.frontend-origin:http://localhost:3000}")
    private String frontendOrigin;

    /** 로그인 후 SPA 진입 경로 (쿼리로 프론트가 /users/me 재동기화·환영 토스트) */
    @Value("${app.post-login-redirect-path:/map}")
    private String postLoginRedirectPath;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication)
            throws IOException {
        Object principal = authentication.getPrincipal();
        if (principal instanceof OAuth2User oauth2User) {
            userService.upsertFromOAuth2(oauth2User);
        }
        String origin = frontendOrigin.endsWith("/") ? frontendOrigin.substring(0, frontendOrigin.length() - 1) : frontendOrigin;
        String path = postLoginRedirectPath.startsWith("/") ? postLoginRedirectPath : "/" + postLoginRedirectPath;
        String redirectUrl = origin + path + "?login=success";
        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }
}
