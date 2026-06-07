package com.ildangmap.service;

import com.ildangmap.domain.user.User;
import com.ildangmap.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

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
        String provider = String.valueOf(oauth2User.getAttribute("provider"));
        String providerId = String.valueOf(oauth2User.getAttribute("providerId"));
        if (providerId == null || providerId.isBlank() || "null".equals(providerId)) {
            return Optional.empty();
        }
        return userRepository.findByProviderAndProviderId(provider, providerId).map(User::getId);
    }
}
