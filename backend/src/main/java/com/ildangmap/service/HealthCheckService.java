package com.ildangmap.service;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class HealthCheckService {

    public Map<String, Object> getStatus() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "UP");
        result.put("application", "ildangmap-backend");
        result.put("serverTime", LocalDateTime.now());
        result.put("authMode", "SESSION");
        result.put("oauthProvider", "KAKAO_READY");
        result.put("websocketReady", true);
        return result;
    }
}
