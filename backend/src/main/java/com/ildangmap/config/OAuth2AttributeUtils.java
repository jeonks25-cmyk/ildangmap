package com.ildangmap.config;

import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.util.StringUtils;

/**
 * Kakao OAuth2 attributes → 안전한 String 변환.
 * Spring/JDBC 경계에서 char[] 등 비표준 타입이 섞여 ClassCastException이 날 수 있어 방어합니다.
 */
public final class OAuth2AttributeUtils {

    private OAuth2AttributeUtils() {
    }

    public static String read(OAuth2User user, String key) {
        if (user == null || !StringUtils.hasText(key)) {
            return "";
        }
        return toString(user.getAttributes().get(key));
    }

    public static String toString(Object value) {
        if (value == null) {
            return "";
        }
        if (value instanceof String s) {
            return s;
        }
        if (value instanceof char[] chars) {
            return new String(chars);
        }
        if (value instanceof Number number) {
            return number.toString();
        }
        if (value instanceof Boolean bool) {
            return bool.toString();
        }
        return String.valueOf(value);
    }

    public static String nonBlankOrDefault(String value, String defaultValue) {
        if (!StringUtils.hasText(value) || "null".equalsIgnoreCase(value)) {
            return defaultValue;
        }
        return value;
    }
}
