package com.ildangmap.ildangmap.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class KakaoLoginController {

    @GetMapping("/kakao/login")
    public String kakaoLogin() {

        String clientId = "d82f477a53aa318c778adb248598d5ac";
        String redirectUri = "http://localhost:8080/kakao/callback";

        String kakaoLoginUrl =
                "https://kauth.kakao.com/oauth/authorize" +
                        "?client_id=" + clientId +
                        "&redirect_uri=" + redirectUri +
                        "&response_type=code";

        return kakaoLoginUrl;
    }

    @GetMapping("/kakao/callback")
    public String kakaoCallback(String code) {

        return "카카오 로그인 성공! 인증코드: " + code;
    }
}