package com.ildangmap.api.auth;

import com.ildangmap.global.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth/session")
public class SessionBootstrapStatusController {

    @GetMapping("/status")
    @Operation(summary = "세션 bootstrap 배포 확인", description = "Railway 배포에 bootstrap API가 포함됐는지 확인합니다.")
    public ApiResponse<Map<String, Object>> status() {
        return ApiResponse.success(
                Map.of(
                        "bootstrapAvailable", true,
                        "bootstrapPath", "/api/auth/session/bootstrap",
                        "method", "POST"));
    }
}
