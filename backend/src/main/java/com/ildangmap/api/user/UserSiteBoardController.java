package com.ildangmap.api.user;

import com.ildangmap.api.user.dto.SiteBoardCommentCreateRequest;
import com.ildangmap.api.user.dto.SiteBoardPayloadDto;
import com.ildangmap.api.user.dto.SiteBoardPostCreateRequest;
import com.ildangmap.domain.user.User;
import com.ildangmap.global.api.ApiResponse;
import com.ildangmap.global.exception.UnauthorizedException;
import com.ildangmap.repository.UserRepository;
import com.ildangmap.service.SessionUserService;
import com.ildangmap.service.UserSiteBoardService;
import com.ildangmap.service.UserSiteBoardService.PostAuthor;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class UserSiteBoardController {

    private final UserSiteBoardService userSiteBoardService;
    private final SessionUserService sessionUserService;
    private final UserRepository userRepository;

    @GetMapping({"/users/me/site-boards", "/api/users/me/site-boards"})
    @Operation(summary = "내 현장 게시판 전체 조회")
    public ApiResponse<SiteBoardPayloadDto> getSiteBoards(Authentication authentication) {
        Long userId = requireUserId(authentication);
        return ApiResponse.success(userSiteBoardService.getSiteBoards(userId));
    }

    @PutMapping({"/users/me/site-boards", "/api/users/me/site-boards"})
    @Operation(summary = "내 현장 게시판 전체 저장 (마이그레이션·동기화)")
    public ApiResponse<SiteBoardPayloadDto> saveSiteBoards(
            @Valid @RequestBody SiteBoardPayloadDto request,
            Authentication authentication
    ) {
        Long userId = requireUserId(authentication);
        return ApiResponse.success("현장 게시판을 저장했습니다.", userSiteBoardService.saveSiteBoards(userId, request));
    }

    @GetMapping({"/users/me/site-boards/{briefingId}", "/api/users/me/site-boards/{briefingId}"})
    @Operation(summary = "현장 게시판(briefingId) 조회")
    public ApiResponse<Map<String, Object>> getBoard(
            @PathVariable String briefingId,
            Authentication authentication
    ) {
        Long userId = requireUserId(authentication);
        return ApiResponse.success(userSiteBoardService.getBoard(userId, briefingId));
    }

    @PostMapping({"/users/me/site-boards/{briefingId}/posts", "/api/users/me/site-boards/{briefingId}/posts"})
    @Operation(summary = "게시글 작성", description = "공지·질문·작업내용·작업사진 카테고리 지원")
    public ApiResponse<Map<String, Object>> createPost(
            @PathVariable String briefingId,
            @Valid @RequestBody SiteBoardPostCreateRequest request,
            Authentication authentication
    ) {
        Long userId = requireUserId(authentication);
        PostAuthor author = resolveAuthor(userId);
        return ApiResponse.success("게시했습니다.", userSiteBoardService.createPost(userId, briefingId, request, author));
    }

    @PostMapping({
            "/users/me/site-boards/{briefingId}/posts/{postId}/comments",
            "/api/users/me/site-boards/{briefingId}/posts/{postId}/comments"
    })
    @Operation(summary = "댓글 작성")
    public ApiResponse<Map<String, Object>> createComment(
            @PathVariable String briefingId,
            @PathVariable String postId,
            @Valid @RequestBody SiteBoardCommentCreateRequest request,
            Authentication authentication
    ) {
        Long userId = requireUserId(authentication);
        PostAuthor author = resolveAuthor(userId);
        return ApiResponse.success(
                "댓글을 등록했습니다.",
                userSiteBoardService.createComment(userId, briefingId, postId, request, author));
    }

    private PostAuthor resolveAuthor(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new UnauthorizedException("로그인이 필요합니다."));
        String name =
                user.getDisplayNickname() != null && !user.getDisplayNickname().isBlank()
                        ? user.getDisplayNickname()
                        : "작성자";
        return new PostAuthor(
                userId,
                name,
                user.getProfileImageUrl() != null ? user.getProfileImageUrl() : "",
                "",
                user.getBirthYear());
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
