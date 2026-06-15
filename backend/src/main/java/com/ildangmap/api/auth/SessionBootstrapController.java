package com.ildangmap.api.auth;

import com.ildangmap.global.api.ApiResponse;
import com.ildangmap.service.SessionBootstrapService;
import com.ildangmap.service.SessionBootstrapTokenService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@Slf4j
@RestController
@RequestMapping("/api/auth/session")
@RequiredArgsConstructor
public class SessionBootstrapController {

    private final SessionBootstrapTokenService tokenService;
    private final SessionBootstrapService sessionBootstrapService;

    @PostMapping("/bootstrap")
    @Operation(summary = "OAuth bootstrap 세션 발급", description = "일회용 bt 토큰으로 same-origin 세션 쿠키(ILDANGMAPSESSION)를 발급합니다.")
    public ApiResponse<Void> bootstrap(
            @RequestParam("bt") String bootstrapToken,
            HttpServletRequest request,
            HttpServletResponse response) {
        log.info(
                "[session/bootstrap] request host={} forwardedHost={} hasCookie={}",
                request.getServerName(),
                request.getHeader("X-Forwarded-Host"),
                request.getHeader("Cookie") != null);
        Long userId;
        try {
            userId = tokenService.verifyAndConsume(bootstrapToken);
        } catch (IllegalArgumentException ex) {
            log.warn("[session/bootstrap] invalid token: {}", ex.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
        sessionBootstrapService.establishSession(userId, request, response);
        return ApiResponse.success(null);
    }
}
