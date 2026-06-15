package com.ildangmap.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * OAuth 직후 프론트(same-origin)에서 세션 쿠키를 발급하기 위한 일회용 토큰.
 * Railway OAuth 콜백 도메인과 Vercel SPA 도메인이 달라 Set-Cookie가 전달되지 않을 때 사용한다.
 */
@Service
public class SessionBootstrapTokenService {

    private static final Duration TTL = Duration.ofMinutes(2);
    private static final String HMAC_ALG = "HmacSHA256";

    private final byte[] secretKey;
    private final Set<String> consumedTokens = ConcurrentHashMap.newKeySet();

    public SessionBootstrapTokenService(
            @Value("${app.bootstrap-token-secret:${JWT_SECRET:ildangmap-bootstrap-dev-secret}}") String secret) {
        try {
            this.secretKey = MessageDigest.getInstance("SHA-256").digest(secret.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 not available", ex);
        }
    }

    public String createToken(Long userId) {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("userId is required");
        }
        long exp = Instant.now().getEpochSecond() + TTL.getSeconds();
        String payload = userId + "." + exp;
        String signature = sign(payload);
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString((payload + "." + signature).getBytes(StandardCharsets.UTF_8));
    }

    public Long verifyAndConsume(String token) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("bootstrap token is missing");
        }
        if (!consumedTokens.add(token)) {
            throw new IllegalArgumentException("bootstrap token already used");
        }
        try {
            String decoded = new String(Base64.getUrlDecoder().decode(token), StandardCharsets.UTF_8);
            String[] parts = decoded.split("\\.");
            if (parts.length != 3) {
                throw new IllegalArgumentException("invalid bootstrap token format");
            }
            long userId = Long.parseLong(parts[0]);
            long exp = Long.parseLong(parts[1]);
            String expectedSig = sign(parts[0] + "." + parts[1]);
            if (!expectedSig.equals(parts[2])) {
                throw new IllegalArgumentException("invalid bootstrap token signature");
            }
            if (Instant.now().getEpochSecond() > exp) {
                throw new IllegalArgumentException("bootstrap token expired");
            }
            return userId;
        } catch (RuntimeException ex) {
            consumedTokens.remove(token);
            throw ex;
        } catch (Exception ex) {
            consumedTokens.remove(token);
            throw new IllegalArgumentException("invalid bootstrap token", ex);
        }
    }

    private String sign(String payload) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALG);
            mac.init(new SecretKeySpec(secretKey, HMAC_ALG));
            byte[] raw = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to sign bootstrap token", ex);
        }
    }
}
