package com.ildangmap.api.job;

import com.ildangmap.global.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/applications")
public class ApplicationController {

    private final ApplicationManageCommandService applicationManageCommandService;

    @PostMapping("/{applicationId}/approve")
    @Operation(summary = "지원 승인", description = "공고 소유자가 대기 중인 지원을 확정합니다.")
    public ApiResponse<Void> approve(@PathVariable Long applicationId) {
        applicationManageCommandService.approve(applicationId);
        return ApiResponse.success("지원이 확정되었습니다.", null);
    }

    @PostMapping("/{applicationId}/reject")
    @Operation(summary = "지원 거절", description = "공고 소유자가 대기 중인 지원을 거절합니다.")
    public ApiResponse<Void> reject(@PathVariable Long applicationId) {
        applicationManageCommandService.reject(applicationId);
        return ApiResponse.success("지원이 거절되었습니다.", null);
    }
}
