package com.ildangmap.config;



import com.ildangmap.service.UserService;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.authority.AuthorityUtils;

import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;

import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;

import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;

import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;

import org.springframework.security.oauth2.core.user.DefaultOAuth2User;

import org.springframework.security.oauth2.core.user.OAuth2User;

import org.springframework.stereotype.Component;



import java.util.LinkedHashMap;

import java.util.Map;



@Component

@RequiredArgsConstructor

public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {



    private final DefaultOAuth2UserService delegate = new DefaultOAuth2UserService();

    private final UserService userService;



    @Override

    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {

        OAuth2User oauth2User = delegate.loadUser(userRequest);

        String registrationId = userRequest.getClientRegistration().getRegistrationId();



        Map<String, Object> attributes = new LinkedHashMap<>(oauth2User.getAttributes());

        String providerId = extractProviderId(attributes);

        attributes.put("provider", registrationId);

        attributes.put("providerId", providerId);

        attributes.put("kakaoName", extractKakaoName(registrationId, attributes));

        attributes.put("profileImageUrl", extractProfileImage(registrationId, attributes));



        DefaultOAuth2User enriched = new DefaultOAuth2User(

                AuthorityUtils.createAuthorityList("ROLE_USER"),

                attributes,

                "kakao".equals(registrationId) ? "id" : "name"

        );



        try {

            userService.upsertFromOAuth2(enriched);

        } catch (RuntimeException ex) {

            throw new OAuth2AuthenticationException(
                    new OAuth2Error("oauth_user_persist_failed", ex.getMessage(), null), ex);

        }



        return enriched;

    }



    private String extractProviderId(Map<String, Object> attributes) {

        return OAuth2AttributeUtils.toString(attributes.get("id"));

    }



    private String extractKakaoName(String registrationId, Map<String, Object> attributes) {

        if (!"kakao".equals(registrationId)) {

            return OAuth2AttributeUtils.nonBlankOrDefault(

                    OAuth2AttributeUtils.toString(attributes.get("name")), "ildangmap-user");

        }



        Map<String, Object> kakaoAccount = getMap(attributes.get("kakao_account"));

        Map<String, Object> profile = getMap(kakaoAccount.get("profile"));

        String nickname = OAuth2AttributeUtils.toString(profile.get("nickname"));

        if (OAuth2AttributeUtils.nonBlankOrDefault(nickname, "").isEmpty()) {

            Map<String, Object> properties = getMap(attributes.get("properties"));

            nickname = OAuth2AttributeUtils.toString(properties.get("nickname"));

        }

        return OAuth2AttributeUtils.nonBlankOrDefault(nickname, "kakao-user");

    }



    private String extractProfileImage(String registrationId, Map<String, Object> attributes) {

        if (!"kakao".equals(registrationId)) {

            return OAuth2AttributeUtils.toString(attributes.get("picture"));

        }



        Map<String, Object> kakaoAccount = getMap(attributes.get("kakao_account"));

        Map<String, Object> profile = getMap(kakaoAccount.get("profile"));

        String url = OAuth2AttributeUtils.toString(profile.get("profile_image_url"));

        if (OAuth2AttributeUtils.nonBlankOrDefault(url, "").isEmpty()) {

            Map<String, Object> properties = getMap(attributes.get("properties"));

            url = OAuth2AttributeUtils.toString(properties.get("profile_image"));

        }

        return url;

    }



    @SuppressWarnings("unchecked")

    private Map<String, Object> getMap(Object value) {

        if (value instanceof Map<?, ?> map) {

            return (Map<String, Object>) map;

        }

        return Map.of();

    }

}


