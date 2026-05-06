package com.ildangmap.ildangmap.domain.user;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    // 카카오 ID로 회원 조회
    public Optional<User> findByKakaoId(Long kakaoId) {
        return userRepository.findByKakaoId(kakaoId);
    }

    // 신규 회원 저장
    public User save(User user) {
        return userRepository.save(user);
    }
}