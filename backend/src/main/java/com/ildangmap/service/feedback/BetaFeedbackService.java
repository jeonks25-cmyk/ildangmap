package com.ildangmap.service.feedback;

import com.ildangmap.domain.feedback.BetaFeedback;
import com.ildangmap.domain.feedback.BetaFeedbackAttachment;
import com.ildangmap.domain.feedback.BetaFeedbackCategory;
import com.ildangmap.domain.feedback.BetaFeedbackSeverity;
import com.ildangmap.domain.feedback.BetaFeedbackStatus;
import com.ildangmap.domain.user.User;
import com.ildangmap.global.exception.BadRequestException;
import com.ildangmap.global.exception.UnauthorizedException;
import com.ildangmap.repository.BetaFeedbackAttachmentRepository;
import com.ildangmap.repository.BetaFeedbackRepository;
import com.ildangmap.repository.UserRepository;
import com.ildangmap.service.AdminAuthService;
import com.ildangmap.service.storage.FeedbackStorageService;
import com.ildangmap.service.storage.StoredFile;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class BetaFeedbackService {

    private static final int MAX_IMAGES = 3;
    private static final long MAX_IMAGE_BYTES = 2L * 1024 * 1024;

    private final BetaFeedbackRepository feedbackRepository;
    private final BetaFeedbackAttachmentRepository attachmentRepository;
    private final UserRepository userRepository;
    private final FeedbackStorageService storageService;
    private final AdminAuthService adminAuthService;

    @Transactional
    public BetaFeedback submitFeedback(
            Long userId,
            BetaFeedbackCategory category,
            BetaFeedbackSeverity severity,
            String inconvenient,
            String featureRequest,
            String otherComment,
            List<MultipartFile> images
    ) {
        User user = requireUser(userId);
        validateContent(inconvenient, featureRequest, otherComment);
        List<MultipartFile> files = normalizeImages(images);

        String groupKey = buildSimilarityGroupKey(category, inconvenient, featureRequest, otherComment);
        BetaFeedback feedback = BetaFeedback.builder()
                .userId(user.getId())
                .displayNickname(user.getDisplayNickname())
                .userType(user.getUserType())
                .category(category)
                .severity(severity)
                .inconvenient(trimToNull(inconvenient))
                .featureRequest(trimToNull(featureRequest))
                .otherComment(trimToNull(otherComment))
                .similarityGroupKey(groupKey)
                .build();

        for (MultipartFile file : files) {
            if (file.getSize() > MAX_IMAGE_BYTES) {
                throw new BadRequestException("이미지는 파일당 2MB 이하만 업로드할 수 있습니다.");
            }
            StoredFile stored = storageService.store(file);
            feedback.addAttachment(BetaFeedbackAttachment.builder()
                    .fileName(stored.originalFileName())
                    .contentType(stored.contentType())
                    .fileSize(stored.size())
                    .storagePath(stored.storagePath())
                    .build());
        }

        return feedbackRepository.save(feedback);
    }

    @Transactional(readOnly = true)
    public Page<BetaFeedback> listForAdmin(BetaFeedbackStatus status, BetaFeedbackSeverity severity, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50));
        if (status != null && severity != null) {
            return feedbackRepository.findByStatusAndSeverityOrderByCreatedAtDesc(status, severity, pageable);
        }
        if (status != null) {
            return feedbackRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
        }
        if (severity != null) {
            return feedbackRepository.findBySeverityOrderByCreatedAtDesc(severity, pageable);
        }
        return feedbackRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    @Transactional(readOnly = true)
    public BetaFeedback getForAdmin(Long feedbackId) {
        return feedbackRepository.findWithAttachmentsById(feedbackId)
                .orElseThrow(() -> new BadRequestException("피드백을 찾을 수 없습니다."));
    }

    @Transactional
    public BetaFeedback updateStatus(Long feedbackId, BetaFeedbackStatus status) {
        BetaFeedback feedback = getForAdmin(feedbackId);
        feedback.changeStatus(status);
        return feedback;
    }

    @Transactional(readOnly = true)
    public long countSimilar(BetaFeedback feedback) {
        return feedbackRepository.countBySimilarityGroupKey(feedback.getSimilarityGroupKey());
    }

    @Transactional(readOnly = true)
    public List<BetaFeedbackRepository.SimilarityGroupCount> topSimilarGroups() {
        return feedbackRepository.countGroupedBySimilarity();
    }

    @Transactional(readOnly = true)
    public Resource loadAttachment(Long attachmentId, Long requesterUserId) {
        BetaFeedbackAttachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new BadRequestException("첨부 파일을 찾을 수 없습니다."));
        Long ownerId = attachment.getFeedback().getUserId();
        if (!ownerId.equals(requesterUserId) && !adminAuthService.isAdmin(requesterUserId)) {
            throw new UnauthorizedException("첨부 파일에 접근할 수 없습니다.");
        }
        return storageService.loadAsResource(attachment.getStoragePath());
    }

    @Transactional(readOnly = true)
    public BetaFeedbackAttachment getAttachmentMeta(Long attachmentId) {
        return attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new BadRequestException("첨부 파일을 찾을 수 없습니다."));
    }

    private User requireUser(Long userId) {
        if (userId == null) {
            throw new UnauthorizedException("로그인이 필요합니다.");
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new UnauthorizedException("로그인이 필요합니다."));
    }

    private static void validateContent(String inconvenient, String featureRequest, String otherComment) {
        if (!StringUtils.hasText(inconvenient) && !StringUtils.hasText(featureRequest) && !StringUtils.hasText(otherComment)) {
            throw new BadRequestException("피드백 내용을 하나 이상 입력해 주세요.");
        }
    }

    private static List<MultipartFile> normalizeImages(List<MultipartFile> images) {
        if (images == null || images.isEmpty()) {
            return List.of();
        }
        List<MultipartFile> files = new ArrayList<>();
        for (MultipartFile file : images) {
            if (file != null && !file.isEmpty()) {
                files.add(file);
            }
        }
        if (files.size() > MAX_IMAGES) {
            throw new BadRequestException("스크린샷은 최대 " + MAX_IMAGES + "장까지 첨부할 수 있습니다.");
        }
        return files;
    }

    static String buildSimilarityGroupKey(
            BetaFeedbackCategory category,
            String inconvenient,
            String featureRequest,
            String otherComment
    ) {
        String payload = normalize(inconvenient) + "|" + normalize(featureRequest) + "|" + normalize(otherComment);
        if (!StringUtils.hasText(payload.replace("|", ""))) {
            return category.name() + ":empty";
        }
        String hash = sha256Hex(payload);
        return category.name() + ":" + hash.substring(0, 24);
    }

    private static String normalize(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        return value.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    private static String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private static String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            return Integer.toHexString(input.hashCode());
        }
    }
}
