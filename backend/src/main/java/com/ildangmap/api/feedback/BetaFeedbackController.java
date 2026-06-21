package com.ildangmap.api.feedback;

import com.ildangmap.api.feedback.dto.BetaFeedbackCreatedResponse;
import com.ildangmap.domain.feedback.BetaFeedbackCategory;
import com.ildangmap.domain.feedback.BetaFeedbackSeverity;
import com.ildangmap.global.api.ApiResponse;
import com.ildangmap.global.exception.UnauthorizedException;
import com.ildangmap.service.SessionUserService;
import com.ildangmap.service.feedback.BetaFeedbackService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
public class BetaFeedbackController {

    private final BetaFeedbackService feedbackService;
    private final SessionUserService sessionUserService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "베타 피드백 제출")
    public ApiResponse<BetaFeedbackCreatedResponse> submit(
            @RequestParam("category") BetaFeedbackCategory category,
            @RequestParam("severity") BetaFeedbackSeverity severity,
            @RequestParam(value = "inconvenient", required = false) String inconvenient,
            @RequestParam(value = "featureRequest", required = false) String featureRequest,
            @RequestParam(value = "otherComment", required = false) String otherComment,
            @RequestParam(value = "images", required = false) List<MultipartFile> images,
            Authentication authentication
    ) {
        Long userId = requireUserId(authentication);
        var feedback = feedbackService.submitFeedback(
                userId,
                category,
                severity,
                inconvenient,
                featureRequest,
                otherComment,
                images
        );
        return ApiResponse.success("피드백을 접수했습니다.", BetaFeedbackCreatedResponse.from(feedback));
    }

    @GetMapping("/attachments/{attachmentId}")
    @Operation(summary = "피드백 첨부 이미지 조회")
    public ResponseEntity<Resource> attachment(
            @PathVariable Long attachmentId,
            Authentication authentication
    ) {
        Long userId = requireUserId(authentication);
        var meta = feedbackService.getAttachmentMeta(attachmentId);
        Resource resource = feedbackService.loadAttachment(attachmentId, userId);
        String encodedName = URLEncoder.encode(meta.getFileName(), StandardCharsets.UTF_8).replace("+", "%20");
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(meta.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename*=UTF-8''" + encodedName)
                .body(resource);
    }

    private Long requireUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedException("로그인이 필요합니다.");
        }
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof OAuth2User)) {
            throw new UnauthorizedException("로그인이 필요합니다.");
        }
        return sessionUserService.resolveCurrentUserId()
                .orElseThrow(() -> new UnauthorizedException("로그인이 필요합니다."));
    }
}
