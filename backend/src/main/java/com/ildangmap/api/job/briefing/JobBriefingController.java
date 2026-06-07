package com.ildangmap.api.job.briefing;

import com.ildangmap.api.job.briefing.dto.BriefingPostCreateRequest;
import com.ildangmap.api.job.briefing.dto.BriefingPostResponse;
import com.ildangmap.api.job.briefing.dto.BriefingRoomResponse;
import com.ildangmap.global.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/jobs/{jobId}")
public class JobBriefingController {

    private final JobBriefingService jobBriefingService;

    @GetMapping("/briefing-room")
    @Operation(summary = "현장 브리핑룸 정보", description = "공고·참여자 기반 현장 요약 정보를 반환합니다.")
    public ApiResponse<BriefingRoomResponse> getBriefingRoom(@PathVariable Long jobId) {
        return ApiResponse.success(jobBriefingService.getBriefingRoom(jobId));
    }

    @GetMapping("/briefing-posts")
    @Operation(summary = "브리핑 피드 목록", description = "현장 공지·변경 피드를 최신순으로 반환합니다.")
    public ApiResponse<List<BriefingPostResponse>> listBriefingPosts(@PathVariable Long jobId) {
        return ApiResponse.success(jobBriefingService.listPosts(jobId));
    }

    @PostMapping("/briefing-posts")
    @Operation(summary = "브리핑 글 작성", description = "참여자가 현장 피드 글을 등록합니다.")
    public ApiResponse<BriefingPostResponse> createBriefingPost(
            @PathVariable Long jobId,
            @Valid @RequestBody BriefingPostCreateRequest request
    ) {
        return ApiResponse.success("등록되었습니다.", jobBriefingService.createPost(jobId, request));
    }
}
