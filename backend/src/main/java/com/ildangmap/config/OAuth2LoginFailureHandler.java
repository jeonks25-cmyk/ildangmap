package com.ildangmap.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class OAuth2LoginFailureHandler extends SimpleUrlAuthenticationFailureHandler {

    @Value("${app.frontend-origin:http://localhost:3000}")
    private String frontendOrigin;

    @Value("${app.post-login-redirect-path:/auth/callback}")
    private String postLoginRedirectPath;

    @Override
    public void onAuthenticationFailure(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException exception
    ) throws IOException {
        String origin = frontendOrigin.endsWith("/") ? frontendOrigin.substring(0, frontendOrigin.length() - 1) : frontendOrigin;
        String path = postLoginRedirectPath.startsWith("/") ? postLoginRedirectPath : "/" + postLoginRedirectPath;
        getRedirectStrategy().sendRedirect(request, response, origin + path + "?login=error");
    }
}
