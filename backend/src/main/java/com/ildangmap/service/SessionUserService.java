package com.ildangmap.service;

import com.ildangmap.config.OAuth2AttributeUtils;
import com.ildangmap.domain.user.User;
import com.ildangmap.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SessionUserService {

    private final UserRepository userRepository;

    public Optional<Long> resolveCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof OAuth2User oauth2User)) {
            return Optional.empty();
        }
        String provider = OAuth2AttributeUtils.nonBlankOrDefault(
                OAuth2AttributeUtils.read(oauth2User, "provider"), "kakao");
        String providerId = OAuth2AttributeUtils.read(oauth2User, "providerId");
        if (!StringUtils.hasText(providerId)) {
            providerId = OAuth2AttributeUtils.read(oauth2User, "id");
        }
        if (!StringUtils.hasText(providerId)) {
            return Optional.empty();
        }
        return userRepository.findByProviderAndProviderId(provider, providerId).map(User::getId);
    }
}
