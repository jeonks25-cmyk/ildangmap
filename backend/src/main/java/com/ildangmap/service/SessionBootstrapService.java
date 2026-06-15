package com.ildangmap.service;

import com.ildangmap.domain.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class SessionBootstrapService {

    private final UserService userService;
    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();

    public void establishSession(Long userId, HttpServletRequest request, HttpServletResponse response) {
        User user = userService.getUser(userId);
        String provider = user.getProvider() != null ? user.getProvider() : "kakao";

        Map<String, Object> attributes = new LinkedHashMap<>();
        attributes.put("id", user.getProviderId());
        attributes.put("provider", provider);
        attributes.put("providerId", user.getProviderId());
        attributes.put("kakaoName", user.getKakaoName());
        attributes.put("profileImageUrl", user.getProfileImageUrl() != null ? user.getProfileImageUrl() : "");

        OAuth2User oauth2User = new DefaultOAuth2User(
                AuthorityUtils.createAuthorityList("ROLE_USER"),
                attributes,
                "id");

        OAuth2AuthenticationToken authentication =
                new OAuth2AuthenticationToken(oauth2User, oauth2User.getAuthorities(), provider);

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        HttpSession session = request.getSession(true);
        securityContextRepository.saveContext(context, request, response);

        log.info(
                "[session/bootstrap] userId={} sessionId={} host={} forwardedHost={} setCookieHeaders={}",
                userId,
                session.getId(),
                request.getServerName(),
                request.getHeader("X-Forwarded-Host"),
                response.getHeaders("Set-Cookie"));
    }
}
