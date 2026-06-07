package com.ildangmap.api.health;

import com.ildangmap.global.api.ApiResponse;
import com.ildangmap.service.HealthCheckService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/health")
public class HealthCheckController {

    private final HealthCheckService healthCheckService;

    @GetMapping
    @Operation(summary = "Health check", description = "백엔드 상태와 기본 실행 정보를 반환합니다.")
    public ApiResponse<Map<String, Object>> health() {
        return ApiResponse.success("백엔드가 정상 동작 중입니다.", healthCheckService.getStatus());
    }
}
