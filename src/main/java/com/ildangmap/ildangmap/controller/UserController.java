package com.ildangmap.ildangmap.controller;

import com.ildangmap.ildangmap.domain.user.User;
import com.ildangmap.ildangmap.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/user")
@CrossOrigin
public class UserController {

    private final UserRepository userRepository;

    // 🔥 회원 생성
    @PostMapping
    public User create(@RequestBody User user) {
        return userRepository.save(user);
    }

    // 🔥 전체 조회 (테스트용)
    @GetMapping
    public List<User> getAll() {
        return userRepository.findAll();
    }
}