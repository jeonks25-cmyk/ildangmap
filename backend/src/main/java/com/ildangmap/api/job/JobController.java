package com.ildangmap.api.job;

import com.ildangmap.api.job.dto.ApplyJobRequest;
import com.ildangmap.api.job.dto.ApplyJobResponse;
import com.ildangmap.api.job.dto.JobCreateRequest;
import com.ildangmap.api.job.dto.JobSummaryResponse;
import com.ildangmap.global.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/jobs")
public class JobController {

    private final JobQueryService jobQueryService;
    private final JobCommandService jobCommandService;
    private final ApplyCommandService applyCommandService;
    private final JobLifecycleCommandService jobLifecycleCommandService;

    @GetMapping
    @Operation(summary = "공고 목록", description = "모집 중인 공고 요약 목록을 반환합니다.")
    public ApiResponse<List<JobSummaryResponse>> getJobs() {
        return ApiResponse.success(jobQueryService.getJobSummaries());
    }

    @PostMapping
    @Operation(summary = "공고 등록", description = "새 공고를 등록하고 요약 정보를 반환합니다.")
    public ApiResponse<JobSummaryResponse> createJob(@Valid @RequestBody JobCreateRequest request) {
        return ApiResponse.success("공고가 등록되었습니다.", jobCommandService.createJob(request));
    }

    @PostMapping("/{jobId}/apply")
    @Operation(summary = "공고 지원", description = "공고에 지원하고 상태를 반환합니다.")
    public ApiResponse<ApplyJobResponse> applyJob(
            @PathVariable Long jobId,
            @Valid @RequestBody ApplyJobRequest request
    ) {
        return ApiResponse.success("지원이 완료되었습니다.", applyCommandService.apply(jobId, request));
    }

    @PostMapping("/{jobId}/close-recruitment")
    @Operation(summary = "모집 마감", description = "모집 중 공고를 마감 상태로 전환합니다. (소유자 전용)")
    public ApiResponse<JobSummaryResponse> closeRecruitment(@PathVariable Long jobId) {
        return ApiResponse.success("모집을 마감했습니다.", jobLifecycleCommandService.closeRecruitment(jobId));
    }

    @PostMapping("/{jobId}/start-work")
    @Operation(summary = "작업 시작", description = "확정된 공고를 작업 중으로 전환합니다. (소유자 전용)")
    public ApiResponse<JobSummaryResponse> startWork(@PathVariable Long jobId) {
        return ApiResponse.success("작업을 시작했습니다.", jobLifecycleCommandService.startWork(jobId));
    }

    @PostMapping("/{jobId}/complete")
    @Operation(summary = "작업 완료", description = "작업 중인 공고를 완료 처리합니다. (소유자 전용)")
    public ApiResponse<JobSummaryResponse> completeWork(@PathVariable Long jobId) {
        return ApiResponse.success("작업을 완료했습니다.", jobLifecycleCommandService.completeWork(jobId));
    }

    @PostMapping("/{jobId}/cancel")
    @Operation(summary = "공고 취소", description = "공고를 취소 상태로 둡니다. (소유자 전용)")
    public ApiResponse<JobSummaryResponse> cancelJob(@PathVariable Long jobId) {
        return ApiResponse.success("공고를 취소했습니다.", jobLifecycleCommandService.cancelJob(jobId));
    }
}
