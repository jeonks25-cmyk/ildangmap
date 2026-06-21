package com.ildangmap.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class HealthCheckService {

    private static final String SAMPLE_CLIENT_ID = "sample-kakao-client-id";

    private final String kakaoClientId;

    public HealthCheckService(
            @Value("${spring.security.oauth2.client.registration.kakao.client-id:}") String kakaoClientId) {
        this.kakaoClientId = kakaoClientId == null ? "" : kakaoClientId.trim();
    }

    public Map<String, Object> getStatus() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "UP");
        result.put("application", "ildangmap-backend");
        result.put("serverTime", LocalDateTime.now());
        result.put("authMode", "SESSION");
        result.put("sessionBootstrap", true);
        result.put("oauthProvider", resolveOAuthProviderStatus());
        result.put("websocketReady", true);
        result.put("nicknameChangePolicy", "unlimited");
        return result;
    }

    private String resolveOAuthProviderStatus() {
        if (kakaoClientId.isEmpty() || SAMPLE_CLIENT_ID.equals(kakaoClientId)) {
            return "KAKAO_MISCONFIGURED";
        }
        return "KAKAO_CONFIGURED";
    }
}
