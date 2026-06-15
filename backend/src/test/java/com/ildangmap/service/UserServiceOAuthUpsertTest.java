package com.ildangmap.service;

import com.ildangmap.domain.user.User;
import com.ildangmap.repository.NicknameChangeHistoryRepository;
import com.ildangmap.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceOAuthUpsertTest {

    @Mock
    UserRepository userRepository;

    @Mock
    NicknameChangeHistoryRepository nicknameChangeHistoryRepository;

    @InjectMocks
    UserService userService;

    @Test
    void upsertFromOAuth2_createsUserWithoutEmail() {
        Map<String, Object> attrs = new LinkedHashMap<>();
        attrs.put("id", 999888777L);
        attrs.put("provider", "kakao");
        attrs.put("providerId", "999888777");
        attrs.put("kakaoName", "테스트유저");
        attrs.put("profileImageUrl", "https://example.com/a.jpg");

        OAuth2User oauth2User = new DefaultOAuth2User(
                AuthorityUtils.createAuthorityList("ROLE_USER"),
                attrs,
                "id"
        );

        when(userRepository.findByProviderAndProviderId("kakao", "999888777")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            ReflectionTestUtils.setField(user, "id", 1L);
            return user;
        });

        User saved = userService.upsertFromOAuth2(oauth2User);

        assertThat(saved.getEmail()).isNull();
        assertThat(saved.getProviderId()).isEqualTo("999888777");
        assertThat(saved.getKakaoName()).isEqualTo("테스트유저");
    }
}
