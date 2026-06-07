package com.ildangmap.repository;

import com.ildangmap.domain.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByProviderAndProviderId(String provider, String providerId);

    boolean existsByDisplayNickname(String displayNickname);

    Optional<User> findByDisplayNickname(String displayNickname);
}
