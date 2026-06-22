package com.ildangmap.service;

import com.ildangmap.api.scheduleboard.dto.MentionDto;
import com.ildangmap.api.scheduleboard.dto.ScheduleBoardCommentCreateRequest;
import com.ildangmap.api.scheduleboard.dto.ScheduleBoardCommentResponse;
import com.ildangmap.api.scheduleboard.dto.ScheduleBoardNotificationEventResponse;
import com.ildangmap.api.scheduleboard.dto.ScheduleBoardPostCreateRequest;
import com.ildangmap.api.scheduleboard.dto.ScheduleBoardPostListResponse;
import com.ildangmap.api.scheduleboard.dto.ScheduleBoardPostResponse;
import com.ildangmap.api.scheduleboard.dto.ScheduleBoardReadResponse;
import com.ildangmap.api.scheduleboard.dto.ScheduleBoardSummaryResponse;
import com.ildangmap.api.user.dto.SiteBoardPayloadDto;
import com.ildangmap.domain.scheduleboard.ScheduleBoardComment;
import com.ildangmap.domain.scheduleboard.ScheduleBoardMention;
import com.ildangmap.domain.scheduleboard.ScheduleBoardNotificationEvent;
import com.ildangmap.domain.scheduleboard.ScheduleBoardPost;
import com.ildangmap.domain.scheduleboard.ScheduleBoardPostImage;
import com.ildangmap.domain.scheduleboard.ScheduleBoardPostRead;
import com.ildangmap.domain.scheduleboard.ScheduleBoardPostType;
import com.ildangmap.domain.user.User;
import com.ildangmap.global.exception.BadRequestException;
import com.ildangmap.global.exception.ForbiddenException;
import com.ildangmap.global.exception.ResourceNotFoundException;
import com.ildangmap.repository.ScheduleBoardCommentRepository;
import com.ildangmap.repository.ScheduleBoardMentionRepository;
import com.ildangmap.repository.ScheduleBoardNotificationEventRepository;
import com.ildangmap.repository.ScheduleBoardPostImageRepository;
import com.ildangmap.repository.ScheduleBoardPostReadRepository;
import com.ildangmap.repository.ScheduleBoardPostRepository;
import com.ildangmap.repository.UserRepository;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ScheduleBoardService {

    private static final int MAX_IMAGE_BYTES = 200_000;
    private static final int MAX_IMAGES = 8;
    private static final List<ScheduleBoardPostType> GENERAL_TYPES =
            List.of(ScheduleBoardPostType.question, ScheduleBoardPostType.worklog, ScheduleBoardPostType.photo);

    private final ScheduleBoardPostRepository postRepository;
    private final ScheduleBoardCommentRepository commentRepository;
    private final ScheduleBoardPostReadRepository readRepository;
    private final ScheduleBoardPostImageRepository imageRepository;
    private final ScheduleBoardMentionRepository mentionRepository;
    private final ScheduleBoardNotificationEventRepository notificationRepository;
    private final ScheduleBoardAccessService accessService;
    private final UserSiteBoardService legacySiteBoardService;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public ScheduleBoardSummaryResponse getSummary(Long userId, String scheduleId) {
        String sid = accessService.normalizeScheduleId(scheduleId);
        accessService.requireRead(userId, sid);
        maybeMigrateLegacy(userId, sid);

        long notice = postRepository.countUnreadByType(sid, ScheduleBoardPostType.notice, userId);
        long posts = postRepository.countUnreadByTypes(sid, GENERAL_TYPES, userId);
        Instant lastPostAt = postRepository.findLastPostAt(sid).map(this::toInstant).orElse(null);

        return ScheduleBoardSummaryResponse.builder()
                .scheduleId(sid)
                .unreadNoticeCount((int) notice)
                .unreadPostCount((int) posts)
                .unreadTotalCount((int) (notice + posts))
                .lastPostAt(lastPostAt)
                .build();
    }

    @Transactional(readOnly = true)
    public ScheduleBoardPostListResponse listPosts(Long userId, String scheduleId) {
        String sid = accessService.normalizeScheduleId(scheduleId);
        accessService.requireRead(userId, sid);
        maybeMigrateLegacy(userId, sid);

        List<ScheduleBoardPost> posts = postRepository.findActiveByScheduleIdOrderPinned(sid);
        List<ScheduleBoardPostResponse> items = posts.stream()
                .map(p -> toPostResponse(p, userId, true))
                .toList();
        return ScheduleBoardPostListResponse.builder().items(items).nextCursor(null).build();
    }

    @Transactional(readOnly = true)
    public List<ScheduleBoardCommentResponse> listComments(Long userId, String scheduleId, Long postId) {
        String sid = accessService.normalizeScheduleId(scheduleId);
        accessService.requireRead(userId, sid);
        ScheduleBoardPost post = requirePost(sid, postId);
        return commentRepository.findByPostOrderByCreatedAtAsc(post).stream()
                .map(this::toCommentResponse)
                .toList();
    }

    @Transactional
    public ScheduleBoardPostResponse createPost(Long userId, String scheduleId, ScheduleBoardPostCreateRequest request) {
        String sid = accessService.normalizeScheduleId(scheduleId);
        ScheduleBoardAccessService.Access access = accessService.requireWrite(userId, sid);
        ScheduleBoardPostType postType = ScheduleBoardPostType.fromWire(request.getPostType());
        if (postType == ScheduleBoardPostType.notice && !access.isOwner()) {
            throw new ForbiddenException("공지는 현장 소장만 작성할 수 있습니다.");
        }

        User author = requireUser(userId);
        String body = request.getBody() != null ? request.getBody().trim() : "";
        List<String> images = collectImages(request);
        if (body.isEmpty() && images.isEmpty()) {
            throw new BadRequestException("내용을 입력해 주세요.");
        }
        if (postType == ScheduleBoardPostType.photo && body.isEmpty() && !images.isEmpty()) {
            body = "작업사진";
        }

        String briefingId = resolveBriefingId(request.getBriefingId(), access.getSchedule());
        ScheduleBoardPost post = ScheduleBoardPost.builder()
                .scheduleId(sid)
                .briefingId(briefingId)
                .authorUserId(userId)
                .authorName(displayName(author))
                .authorImageUrl(author.getProfileImageUrl())
                .postType(postType)
                .body(body)
                .build();
        postRepository.save(post);

        saveImages(post, images);
        saveMentions(post, null, request.getMentions(), userId);
        markRead(userId, post);

        emitPostNotifications(post, access, userId, displayName(author));

        return toPostResponse(post, userId, false);
    }

    @Transactional
    public ScheduleBoardCommentResponse createComment(
            Long userId, String scheduleId, Long postId, ScheduleBoardCommentCreateRequest request) {
        String sid = accessService.normalizeScheduleId(scheduleId);
        accessService.requireWrite(userId, sid);
        ScheduleBoardPost post = requirePost(sid, postId);

        User author = requireUser(userId);
        String body = request.getBody() != null ? request.getBody().trim() : "";
        if (body.isEmpty()) {
            throw new BadRequestException("댓글 내용을 입력해 주세요.");
        }

        ScheduleBoardComment comment = ScheduleBoardComment.builder()
                .post(post)
                .authorUserId(userId)
                .authorName(displayName(author))
                .body(body)
                .build();
        commentRepository.save(comment);
        saveMentions(post, comment, request.getMentions(), userId);

        String briefingId = post.getBriefingId();
        if (!post.getAuthorUserId().equals(userId)) {
            saveNotification(
                    post.getAuthorUserId(),
                    ScheduleBoardNotificationEvent.EventType.comment,
                    sid,
                    briefingId,
                    post.getId(),
                    comment.getId(),
                    userId,
                    displayName(author),
                    truncate(body, 120));
        }
        for (MentionDto  m : dedupeMentions(request.getMentions())) {
            if (m.getUserId() == null || m.getUserId().equals(userId)) continue;
            saveNotification(
                    m.getUserId(),
                    ScheduleBoardNotificationEvent.EventType.mention,
                    sid,
                    briefingId,
                    post.getId(),
                    comment.getId(),
                    userId,
                    displayName(author),
                    truncate(body, 120));
        }

        return toCommentResponse(comment);
    }

    @Transactional
    public ScheduleBoardReadResponse markPostRead(Long userId, String scheduleId, Long postId) {
        String sid = accessService.normalizeScheduleId(scheduleId);
        accessService.requireRead(userId, sid);
        ScheduleBoardPost post = requirePost(sid, postId);
        LocalDateTime readAt = markRead(userId, post);
        return ScheduleBoardReadResponse.builder()
                .postId(postId)
                .readAt(toInstant(readAt))
                .build();
    }

    @Transactional(readOnly = true)
    public List<ScheduleBoardNotificationEventResponse> pullUndeliveredNotifications(Long userId) {
        return notificationRepository.findByRecipientUserIdAndDeliveredAtIsNullOrderByCreatedAtDesc(userId).stream()
                .map(this::toNotificationResponse)
                .toList();
    }

    @Transactional
    public void markNotificationsDelivered(Long userId, List<Long> ids) {
        if (ids == null || ids.isEmpty()) return;
        for (Long id : ids) {
            notificationRepository.findById(id).ifPresent(event -> {
                if (event.getRecipientUserId().equals(userId)) {
                    event.markDelivered();
                }
            });
        }
    }

    private void maybeMigrateLegacy(Long userId, String scheduleId) {
        if (postRepository.countByScheduleIdAndDeletedAtIsNull(scheduleId) > 0) {
            return;
        }
        ScheduleBoardAccessService.Access access = accessService.resolve(userId, scheduleId);
        if (access.getSchedule() == null) return;
        String briefingId = accessService.briefingIdFromSchedule(access.getSchedule());
        if (briefingId == null || briefingId.isBlank()) return;

        SiteBoardPayloadDto legacy = legacySiteBoardService.getSiteBoards(userId);
        Map<String, Object> board = legacy.getBoardsByBriefingId().get(briefingId);
        if (board == null || board.isEmpty()) return;

        Object postsRaw = board.get("posts");
        if (!(postsRaw instanceof List<?> posts) || posts.isEmpty()) return;

        for (Object item : posts) {
            if (!(item instanceof Map<?, ?> map)) continue;
            migrateLegacyPost(scheduleId, briefingId, map, board);
        }
    }

    @SuppressWarnings("unchecked")
    private void migrateLegacyPost(String scheduleId, String briefingId, Map<?, ?> rawMap, Map<String, Object> board) {
        Map<String, Object> map = (Map<String, Object>) rawMap;
        String body = String.valueOf(map.getOrDefault("body", "")).trim();
        ScheduleBoardPostType type = ScheduleBoardPostType.fromWire(String.valueOf(map.get("postType")));
        long authorUserId = toLong(map.get("authorUserId"));
        if (authorUserId <= 0) authorUserId = 1L;

        ScheduleBoardPost post = ScheduleBoardPost.builder()
                .scheduleId(scheduleId)
                .briefingId(briefingId)
                .authorUserId(authorUserId)
                .authorName(String.valueOf(map.getOrDefault("authorName", "작성자")))
                .authorImageUrl(String.valueOf(map.getOrDefault("authorImageUrl", "")))
                .postType(type)
                .body(body.isEmpty() ? " " : body)
                .build();
        postRepository.save(post);

        Object image = map.get("imageDataUrl");
        if (image != null && String.valueOf(image).startsWith("data:image/")) {
            imageRepository.save(ScheduleBoardPostImage.builder()
                    .post(post)
                    .imageDataUrl(String.valueOf(image))
                    .sortOrder(0)
                    .build());
        }

        Object commentsByPostId = board.get("commentsByPostId");
        if (commentsByPostId instanceof Map<?, ?> byPost) {
            Object legacyPostId = map.get("id");
            Object commentsRaw = byPost.get(String.valueOf(legacyPostId));
            if (commentsRaw instanceof List<?> comments) {
                for (Object c : comments) {
                    if (!(c instanceof Map<?, ?> rawComment)) continue;
                    Map<String, Object> cm = (Map<String, Object>) rawComment;
                    commentRepository.save(ScheduleBoardComment.builder()
                            .post(post)
                            .authorUserId(toLong(cm.get("authorUserId")))
                            .authorName(String.valueOf(cm.getOrDefault("authorName", "작성자")))
                            .body(String.valueOf(cm.getOrDefault("body", "")))
                            .build());
                }
            }
        }
    }

    private void emitPostNotifications(
            ScheduleBoardPost post, ScheduleBoardAccessService.Access access, Long actorUserId, String actorName) {
        if (post.getPostType() != ScheduleBoardPostType.notice) {
            return;
        }
        Set<Long> recipients = participantUserIds(access.getSchedule());
        recipients.remove(actorUserId);
        for (Long recipient : recipients) {
            saveNotification(
                    recipient,
                    ScheduleBoardNotificationEvent.EventType.notice,
                    post.getScheduleId(),
                    post.getBriefingId(),
                    post.getId(),
                    null,
                    actorUserId,
                    actorName,
                    truncate(post.getBody(), 120));
        }
    }

    @SuppressWarnings("unchecked")
    private Set<Long> participantUserIds(Map<String, Object> schedule) {
        Set<Long> ids = new LinkedHashSet<>();
        long owner = toLong(schedule.get("createdByUserId"));
        if (owner > 0) ids.add(owner);
        long accepted = toLong(schedule.get("acceptedParticipantUserId"));
        if (accepted > 0) ids.add(accepted);
        Object invitesRaw = schedule.get("scheduleInvites");
        if (invitesRaw instanceof List<?> invites) {
            for (Object item : invites) {
                if (!(item instanceof Map<?, ?> inv)) continue;
                String st = String.valueOf(inv.get("status")).toLowerCase();
                if (!"accepted".equals(st) && !"confirmed".equals(st) && !"pending".equals(st)) continue;
                long uid = toLong(inv.get("userId"));
                if (uid > 0) ids.add(uid);
            }
        }
        return ids;
    }

    private void saveNotification(
            Long recipientUserId,
            ScheduleBoardNotificationEvent.EventType type,
            String scheduleId,
            String briefingId,
            Long postId,
            Long commentId,
            Long actorUserId,
            String actorName,
            String preview) {
        if (recipientUserId == null || recipientUserId.equals(actorUserId)) return;
        notificationRepository.save(ScheduleBoardNotificationEvent.builder()
                .recipientUserId(recipientUserId)
                .eventType(type)
                .scheduleId(scheduleId)
                .briefingId(briefingId)
                .postId(postId)
                .commentId(commentId)
                .actorUserId(actorUserId)
                .actorName(actorName)
                .preview(preview)
                .build());
    }

    private LocalDateTime markRead(Long userId, ScheduleBoardPost post) {
        return readRepository
                .findByUserIdAndPost(userId, post)
                .map(ScheduleBoardPostRead::getReadAt)
                .orElseGet(() -> {
                    LocalDateTime now = LocalDateTime.now();
                    readRepository.save(ScheduleBoardPostRead.builder()
                            .userId(userId)
                            .post(post)
                            .readAt(now)
                            .build());
                    return now;
                });
    }

    private void saveImages(ScheduleBoardPost post, List<String> images) {
        int order = 0;
        for (String raw : images) {
            if (order >= MAX_IMAGES) break;
            imageRepository.save(ScheduleBoardPostImage.builder()
                    .post(post)
                    .imageDataUrl(raw)
                    .sortOrder(order++)
                    .build());
        }
    }

    private void saveMentions(
            ScheduleBoardPost post,
            ScheduleBoardComment comment,
            List<MentionDto> mentions,
            Long authorUserId) {
        for (MentionDto m : dedupeMentions(mentions)) {
            if (m.getUserId() == null || m.getUserId().equals(authorUserId)) continue;
            mentionRepository.save(ScheduleBoardMention.builder()
                    .post(comment == null ? post : null)
                    .comment(comment)
                    .mentionedUserId(m.getUserId())
                    .mentionedName(m.getName() != null ? m.getName() : "")
                    .build());
            if (comment == null) {
                saveNotification(
                        m.getUserId(),
                        ScheduleBoardNotificationEvent.EventType.mention,
                        post.getScheduleId(),
                        post.getBriefingId(),
                        post.getId(),
                        null,
                        authorUserId,
                        post.getAuthorName(),
                        truncate(post.getBody(), 120));
            }
        }
    }

    private List<MentionDto> dedupeMentions(List<MentionDto> mentions) {
        if (mentions == null || mentions.isEmpty()) return List.of();
        Set<Long> seen = new LinkedHashSet<>();
        List<MentionDto> out = new ArrayList<>();
        for (MentionDto m : mentions) {
            if (m == null || m.getUserId() == null) continue;
            if (seen.add(m.getUserId())) out.add(m);
        }
        return out;
    }

    private List<String> collectImages(ScheduleBoardPostCreateRequest request) {
        List<String> out = new ArrayList<>();
        if (request.getImageDataUrls() != null) {
            for (String raw : request.getImageDataUrls()) {
                String safe = sanitizeImage(raw);
                if (safe != null) out.add(safe);
            }
        }
        String single = sanitizeImage(request.getImageDataUrl());
        if (single != null && out.isEmpty()) {
            out.add(single);
        }
        return out;
    }

    private String sanitizeImage(String raw) {
        if (raw == null) return null;
        String s = raw.trim();
        if (!s.startsWith("data:image/")) return null;
        if (s.length() > MAX_IMAGE_BYTES) {
            throw new BadRequestException("이미지 용량이 너무 큽니다.");
        }
        return s;
    }

    private ScheduleBoardPost requirePost(String scheduleId, Long postId) {
        return postRepository
                .findByIdAndScheduleIdAndDeletedAtIsNull(postId, scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("게시글을 찾을 수 없습니다."));
    }

    private User requireUser(Long userId) {
        return userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));
    }

    private String displayName(User user) {
        if (user.getDisplayNickname() != null && !user.getDisplayNickname().isBlank()) {
            return user.getDisplayNickname();
        }
        return "작성자";
    }

    private String resolveBriefingId(String fromRequest, Map<String, Object> schedule) {
        if (fromRequest != null && !fromRequest.isBlank()) return fromRequest.trim();
        return accessService.briefingIdFromSchedule(schedule);
    }

    private ScheduleBoardPostResponse toPostResponse(ScheduleBoardPost post, Long viewerUserId, boolean includeImages) {
        List<ScheduleBoardPostImage> images = imageRepository.findByPostOrderBySortOrderAsc(post);
        int imageCount = images.size();
        String firstImage = imageCount > 0 ? images.get(0).getImageDataUrl() : null;
        if (firstImage == null && imageCount > 0) {
            firstImage = images.get(0).getImageUrl();
        }
        boolean isRead = post.getAuthorUserId().equals(viewerUserId)
                || readRepository.existsByUserIdAndPost_Id(viewerUserId, post.getId());

        return ScheduleBoardPostResponse.builder()
                .id(post.getId())
                .scheduleId(post.getScheduleId())
                .briefingId(post.getBriefingId())
                .postType(post.getPostType().name())
                .body(post.getBody())
                .authorUserId(post.getAuthorUserId())
                .authorName(post.getAuthorName())
                .authorImageUrl(post.getAuthorImageUrl())
                .imageUrls(List.of())
                .imageDataUrl(includeImages ? firstImage : null)
                .imageCount(imageCount)
                .commentCount((int) commentRepository.countByPost(post))
                .isRead(isRead)
                .createdAt(toInstant(post.getCreatedAt()))
                .updatedAt(toInstant(post.getUpdatedAt()))
                .build();
    }

    private ScheduleBoardCommentResponse toCommentResponse(ScheduleBoardComment comment) {
        return ScheduleBoardCommentResponse.builder()
                .id(comment.getId())
                .postId(comment.getPost().getId())
                .authorUserId(comment.getAuthorUserId())
                .authorName(comment.getAuthorName())
                .body(comment.getBody())
                .createdAt(toInstant(comment.getCreatedAt()))
                .updatedAt(toInstant(comment.getUpdatedAt()))
                .build();
    }

    private ScheduleBoardNotificationEventResponse toNotificationResponse(ScheduleBoardNotificationEvent event) {
        return ScheduleBoardNotificationEventResponse.builder()
                .id(event.getId())
                .eventType(event.getEventType())
                .scheduleId(event.getScheduleId())
                .briefingId(event.getBriefingId())
                .postId(event.getPostId())
                .commentId(event.getCommentId())
                .actorUserId(event.getActorUserId())
                .actorName(event.getActorName())
                .preview(event.getPreview())
                .createdAt(toInstant(event.getCreatedAt()))
                .build();
    }

    private Instant toInstant(LocalDateTime value) {
        if (value == null) return null;
        return value.toInstant(ZoneOffset.UTC);
    }

    private long toLong(Object value) {
        if (value == null) return 0L;
        if (value instanceof Number n) return n.longValue();
        try {
            return Long.parseLong(String.valueOf(value).trim());
        } catch (NumberFormatException e) {
            return 0L;
        }
    }

    private String truncate(String text, int max) {
        if (text == null) return "";
        String s = text.trim();
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }
}
