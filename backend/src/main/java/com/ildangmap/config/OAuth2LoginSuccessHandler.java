package com.ildangmap.config;

import com.ildangmap.domain.user.User;
import com.ildangmap.service.SessionBootstrapTokenService;
import com.ildangmap.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Collection;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserService userService;
    private final SessionBootstrapTokenService sessionBootstrapTokenService;

    @Value("${app.frontend-origin:http://localhost:3000}")
    private String frontendOrigin;

    /** 로그인 후 SPA 진입 경로 (쿼리로 프론트가 /users/me 재동기화·환영 토스트) */
    @Value("${app.post-login-redirect-path:/auth/callback}")
    private String postLoginRedirectPath;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication)
            throws IOException {
        String bootstrapToken = null;
        Object principal = authentication.getPrincipal();
        if (principal instanceof OAuth2User oauth2User) {
            User user = userService.upsertFromOAuth2(oauth2User);
            bootstrapToken = sessionBootstrapTokenService.createToken(user.getId());
        }

        HttpSession session = request.getSession(false);
        Collection<String> setCookieHeaders = response.getHeaders("Set-Cookie");
        log.info(
                "[OAuth success] host={} forwardedHost={} sessionId={} setCookieHeaders={} bootstrapTokenIssued={}",
                request.getServerName(),
                request.getHeader("X-Forwarded-Host"),
                session != null ? session.getId() : "none",
                setCookieHeaders,
                bootstrapToken != null);

        String origin = frontendOrigin.endsWith("/") ? frontendOrigin.substring(0, frontendOrigin.length() - 1) : frontendOrigin;
        String path = postLoginRedirectPath.startsWith("/") ? postLoginRedirectPath : "/" + postLoginRedirectPath;
        StringBuilder redirectUrl = new StringBuilder(origin).append(path).append("?login=success");
        if (bootstrapToken != null) {
            redirectUrl
                    .append("&bt=")
                    .append(URLEncoder.encode(bootstrapToken, StandardCharsets.UTF_8));
        }
        getRedirectStrategy().sendRedirect(request, response, redirectUrl.toString());
    }
}
