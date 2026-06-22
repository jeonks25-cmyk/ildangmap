package com.ildangmap.api.scheduleboard;

import com.ildangmap.api.scheduleboard.dto.ScheduleBoardCommentCreateRequest;
import com.ildangmap.api.scheduleboard.dto.ScheduleBoardCommentResponse;
import com.ildangmap.api.scheduleboard.dto.ScheduleBoardNotificationEventResponse;
import com.ildangmap.api.scheduleboard.dto.ScheduleBoardPostCreateRequest;
import com.ildangmap.api.scheduleboard.dto.ScheduleBoardPostListResponse;
import com.ildangmap.api.scheduleboard.dto.ScheduleBoardPostResponse;
import com.ildangmap.api.scheduleboard.dto.ScheduleBoardReadResponse;
import com.ildangmap.api.scheduleboard.dto.ScheduleBoardSummaryResponse;
import com.ildangmap.global.api.ApiResponse;
import com.ildangmap.global.exception.UnauthorizedException;
import com.ildangmap.service.ScheduleBoardService;
import com.ildangmap.service.SessionUserService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/schedules/{scheduleId}/board")
@RequiredArgsConstructor
public class ScheduleBoardController {

    private final ScheduleBoardService scheduleBoardService;
    private final SessionUserService sessionUserService;

    @GetMapping("/summary")
    @Operation(summary = "게시판 미읽음 배지 집계")
    public ApiResponse<ScheduleBoardSummaryResponse> getSummary(
            @PathVariable String scheduleId, Authentication authentication) {
        Long userId = requireUserId(authentication);
        return ApiResponse.success(scheduleBoardService.getSummary(userId, scheduleId));
    }

    @GetMapping("/posts")
    @Operation(summary = "게시글 목록 (공지 상단 고정)")
    public ApiResponse<ScheduleBoardPostListResponse> listPosts(
            @PathVariable String scheduleId, Authentication authentication) {
        Long userId = requireUserId(authentication);
        return ApiResponse.success(scheduleBoardService.listPosts(userId, scheduleId));
    }

    @PostMapping("/posts")
    @Operation(summary = "게시글 작성")
    public ApiResponse<ScheduleBoardPostResponse> createPost(
            @PathVariable String scheduleId,
            @Valid @RequestBody ScheduleBoardPostCreateRequest request,
            Authentication authentication) {
        Long userId = requireUserId(authentication);
        return ApiResponse.success(
                "게시했습니다.", scheduleBoardService.createPost(userId, scheduleId, request));
    }

    @GetMapping("/posts/{postId}/comments")
    @Operation(summary = "댓글 목록")
    public ApiResponse<List<ScheduleBoardCommentResponse>> listComments(
            @PathVariable String scheduleId, @PathVariable Long postId, Authentication authentication) {
        Long userId = requireUserId(authentication);
        return ApiResponse.success(scheduleBoardService.listComments(userId, scheduleId, postId));
    }

    @PostMapping("/posts/{postId}/comments")
    @Operation(summary = "댓글 작성")
    public ApiResponse<ScheduleBoardCommentResponse> createComment(
            @PathVariable String scheduleId,
            @PathVariable Long postId,
            @Valid @RequestBody ScheduleBoardCommentCreateRequest request,
            Authentication authentication) {
        Long userId = requireUserId(authentication);
        return ApiResponse.success(
                "댓글을 등록했습니다.", scheduleBoardService.createComment(userId, scheduleId, postId, request));
    }

    @PostMapping("/posts/{postId}/read")
    @Operation(summary = "게시글 읽음 처리")
    public ApiResponse<ScheduleBoardReadResponse> markRead(
            @PathVariable String scheduleId, @PathVariable Long postId, Authentication authentication) {
        Long userId = requireUserId(authentication);
        return ApiResponse.success(scheduleBoardService.markPostRead(userId, scheduleId, postId));
    }

    private Long requireUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedException("로그인이 필요합니다.");
        }
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof OAuth2User)) {
            throw new UnauthorizedException("로그인이 필요합니다.");
        }
        return sessionUserService
                .resolveCurrentUserId()
                .orElseThrow(() -> new UnauthorizedException("로그인이 필요합니다."));
    }
}
