package com.ildangmap.config;

import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    private final DefaultOAuth2UserService delegate = new DefaultOAuth2UserService();

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oauth2User = delegate.loadUser(userRequest);
        String registrationId = userRequest.getClientRegistration().getRegistrationId();

        Map<String, Object> attributes = new LinkedHashMap<>(oauth2User.getAttributes());
        attributes.put("provider", registrationId);
        attributes.put("providerId", extractProviderId(attributes));
        attributes.put("email", extractEmail(registrationId, attributes));
        attributes.put("kakaoName", extractKakaoName(registrationId, attributes));
        attributes.put("profileImageUrl", extractProfileImage(registrationId, attributes));

        return new DefaultOAuth2User(
                AuthorityUtils.createAuthorityList("ROLE_USER"),
                attributes,
                "kakao".equals(registrationId) ? "id" : "name"
        );
    }

    private String extractProviderId(Map<String, Object> attributes) {
        Object id = attributes.get("id");
        return id == null ? "" : String.valueOf(id);
    }

    private String extractEmail(String registrationId, Map<String, Object> attributes) {
        if (!"kakao".equals(registrationId)) {
            Object email = attributes.get("email");
            return email == null ? "" : String.valueOf(email);
        }

        Map<String, Object> kakaoAccount = getMap(attributes.get("kakao_account"));
        Object email = kakaoAccount.get("email");
        return email == null ? "" : String.valueOf(email);
    }

    private String extractKakaoName(String registrationId, Map<String, Object> attributes) {
        if (!"kakao".equals(registrationId)) {
            Object name = attributes.get("name");
            return name == null ? "ildangmap-user" : String.valueOf(name);
        }

        Map<String, Object> kakaoAccount = getMap(attributes.get("kakao_account"));
        Map<String, Object> profile = getMap(kakaoAccount.get("profile"));
        Object nickname = profile.get("nickname");
        return nickname == null ? "kakao-user" : String.valueOf(nickname);
    }

    private String extractProfileImage(String registrationId, Map<String, Object> attributes) {
        if (!"kakao".equals(registrationId)) {
            Object image = attributes.get("picture");
            return image == null ? "" : String.valueOf(image);
        }
        Map<String, Object> kakaoAccount = getMap(attributes.get("kakao_account"));
        Map<String, Object> profile = getMap(kakaoAccount.get("profile"));
        Object url = profile.get("profile_image_url");
        return url == null ? "" : String.valueOf(url);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return Map.of();
    }
}
