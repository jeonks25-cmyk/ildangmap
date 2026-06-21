package com.ildangmap.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ildangmap.api.user.dto.SiteBoardCommentCreateRequest;
import com.ildangmap.api.user.dto.SiteBoardPayloadDto;
import com.ildangmap.api.user.dto.SiteBoardPostCreateRequest;
import com.ildangmap.domain.siteboard.UserSiteBoardData;
import com.ildangmap.global.exception.BadRequestException;
import com.ildangmap.global.exception.ResourceNotFoundException;
import com.ildangmap.repository.UserSiteBoardDataRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserSiteBoardService {

    private static final TypeReference<SiteBoardPayloadDto> PAYLOAD_TYPE = new TypeReference<>() {};

    private final UserSiteBoardDataRepository repository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public SiteBoardPayloadDto getSiteBoards(Long userId) {
        return repository.findByUserId(userId).map(this::deserialize).orElseGet(SiteBoardPayloadDto::empty);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getBoard(Long userId, String briefingId) {
        SiteBoardPayloadDto payload = getSiteBoards(userId);
        return boardSlice(payload, briefingId);
    }

    @Transactional
    public SiteBoardPayloadDto saveSiteBoards(Long userId, SiteBoardPayloadDto payload) {
        SiteBoardPayloadDto normalized = normalize(payload);
        String json = serialize(normalized);
        UserSiteBoardData entity =
                repository.findByUserId(userId).orElseGet(() -> UserSiteBoardData.createEmpty(userId));
        entity.replacePayload(json);
        repository.save(entity);
        return normalized;
    }

    @Transactional
    public Map<String, Object> createPost(Long userId, String briefingId, SiteBoardPostCreateRequest request, PostAuthor author) {
        String bid = normalizeBriefingId(briefingId);
        String body = request.getBody() != null ? request.getBody().trim() : "";
        String image = sanitizeImage(request.getImageDataUrl());
        String postType = normalizePostType(request.getPostType());
        if (body.isEmpty() && image == null) {
            throw new BadRequestException("내용을 입력해 주세요.");
        }
        SiteBoardPayloadDto payload = getSiteBoards(userId);
        Map<String, Object> board = ensureBoard(payload, bid);
        List<Map<String, Object>> posts = postsList(board);
        String now = Instant.now().toString();
        Map<String, Object> post = new LinkedHashMap<>();
        post.put("id", "sbp-" + Instant.now().toEpochMilli() + "-" + UUID.randomUUID().toString().substring(0, 4));
        post.put("briefingId", bid);
        post.put("body", body.isEmpty() && "photo".equals(postType) ? "작업사진" : body);
        post.put("postType", postType);
        post.put("authorUserId", author.userId());
        post.put("authorName", author.authorName());
        post.put("authorImageUrl", author.authorImageUrl());
        post.put("authorRoleLabel", author.authorRoleLabel());
        post.put("authorBirthYear", author.authorBirthYear());
        post.put("imageDataUrl", image);
        post.put("createdAt", now);
        post.put("updatedAt", now);
        posts.add(0, post);
        board.put("posts", posts);
        payload.getBoardsByBriefingId().put(bid, board);
        saveSiteBoards(userId, payload);
        return post;
    }

    @Transactional
    public Map<String, Object> createComment(
            Long userId,
            String briefingId,
            String postId,
            SiteBoardCommentCreateRequest request,
            PostAuthor author
    ) {
        String bid = normalizeBriefingId(briefingId);
        String pid = String.valueOf(postId).trim();
        String text = request.getBody() != null ? request.getBody().trim() : "";
        if (text.isEmpty()) {
            throw new BadRequestException("댓글 내용을 입력해 주세요.");
        }
        SiteBoardPayloadDto payload = getSiteBoards(userId);
        Map<String, Object> board = boardSlice(payload, bid);
        if (board.isEmpty()) {
            throw new ResourceNotFoundException("게시판을 찾을 수 없습니다.");
        }
        List<Map<String, Object>> posts = postsList(board);
        boolean postExists = posts.stream().anyMatch(p -> pid.equals(String.valueOf(p.get("id"))));
        if (!postExists) {
            throw new ResourceNotFoundException("게시글을 찾을 수 없습니다.");
        }
        Map<String, Object> commentsByPostId = commentsMap(board);
        List<Map<String, Object>> comments = commentsList(commentsByPostId, pid);
        String now = Instant.now().toString();
        Map<String, Object> comment = new LinkedHashMap<>();
        comment.put("id", "fbc-" + Instant.now().toEpochMilli() + "-" + UUID.randomUUID().toString().substring(0, 4));
        comment.put("postId", pid);
        comment.put("authorUserId", author.userId());
        comment.put("authorName", author.authorName());
        comment.put("body", text);
        comment.put("createdAt", now);
        comment.put("updatedAt", now);
        comments.add(comment);
        commentsByPostId.put(pid, comments);
        board.put("commentsByPostId", commentsByPostId);
        touchPostUpdatedAt(posts, pid, now);
        board.put("posts", posts);
        payload.getBoardsByBriefingId().put(bid, board);
        saveSiteBoards(userId, payload);
        return comment;
    }

    public record PostAuthor(
            Long userId,
            String authorName,
            String authorImageUrl,
            String authorRoleLabel,
            Integer authorBirthYear
    ) {}

    private void touchPostUpdatedAt(List<Map<String, Object>> posts, String postId, String now) {
        for (Map<String, Object> post : posts) {
            if (postId.equals(String.valueOf(post.get("id")))) {
                post.put("updatedAt", now);
                break;
            }
        }
    }

    private Map<String, Object> boardSlice(SiteBoardPayloadDto payload, String briefingId) {
        String bid = normalizeBriefingId(briefingId);
        Map<String, Map<String, Object>> all = payload.getBoardsByBriefingId();
        if (all == null || !all.containsKey(bid)) {
            return Map.of("briefingId", bid, "posts", List.of(), "commentsByPostId", Map.of());
        }
        Map<String, Object> board = all.get(bid);
        Map<String, Object> slice = new LinkedHashMap<>();
        slice.put("briefingId", bid);
        slice.put("posts", postsList(board));
        slice.put("commentsByPostId", commentsMap(board));
        return slice;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> ensureBoard(SiteBoardPayloadDto payload, String briefingId) {
        if (payload.getBoardsByBriefingId() == null) {
            payload.setBoardsByBriefingId(new HashMap<>());
        }
        Map<String, Object> board = payload.getBoardsByBriefingId().get(briefingId);
        if (board == null) {
            board = new LinkedHashMap<>();
            board.put("posts", new ArrayList<>());
            board.put("commentsByPostId", new HashMap<>());
            payload.getBoardsByBriefingId().put(briefingId, board);
        }
        return board;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> postsList(Map<String, Object> board) {
        Object raw = board.get("posts");
        if (raw instanceof List<?> list) {
            List<Map<String, Object>> out = new ArrayList<>();
            for (Object item : list) {
                if (item instanceof Map<?, ?> map) {
                    out.add(new LinkedHashMap<>((Map<String, Object>) map));
                }
            }
            return out;
        }
        return new ArrayList<>();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> commentsMap(Map<String, Object> board) {
        Object raw = board.get("commentsByPostId");
        if (raw instanceof Map<?, ?> map) {
            return new LinkedHashMap<>((Map<String, Object>) map);
        }
        return new HashMap<>();
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> commentsList(Map<String, Object> commentsByPostId, String postId) {
        Object raw = commentsByPostId.get(postId);
        if (raw instanceof List<?> list) {
            List<Map<String, Object>> out = new ArrayList<>();
            for (Object item : list) {
                if (item instanceof Map<?, ?> map) {
                    out.add(new LinkedHashMap<>((Map<String, Object>) map));
                }
            }
            return out;
        }
        return new ArrayList<>();
    }

    private String normalizeBriefingId(String briefingId) {
        String bid = briefingId != null ? briefingId.trim() : "";
        if (bid.isEmpty()) {
            throw new BadRequestException("현장 게시판 ID가 없습니다.");
        }
        return bid;
    }

    private String normalizePostType(String postType) {
        String s = String.valueOf(postType != null ? postType : "general").toLowerCase();
        if ("question".equals(s) || "질문".equals(s)) return "question";
        if ("worklog".equals(s) || "work_log".equals(s) || "작업내용".equals(s)) return "worklog";
        if ("photo".equals(s) || "work_photo".equals(s) || "작업사진".equals(s)) return "photo";
        if ("change".equals(s) || "changed".equals(s)) return "change";
        if ("help_request".equals(s) || "help".equals(s)) return "help_request";
        return "general";
    }

    private String sanitizeImage(String imageDataUrl) {
        if (imageDataUrl == null || imageDataUrl.isBlank()) return null;
        String safe = imageDataUrl.trim();
        if (!safe.startsWith("data:image/")) return null;
        if (safe.length() > 220_000) {
            throw new BadRequestException("첨부 이미지가 너무 큽니다.");
        }
        return safe;
    }

    private SiteBoardPayloadDto normalize(SiteBoardPayloadDto payload) {
        SiteBoardPayloadDto next = payload != null ? payload : SiteBoardPayloadDto.empty();
        if (next.getBoardsByBriefingId() == null) {
            next.setBoardsByBriefingId(new HashMap<>());
        }
        return next;
    }

    private SiteBoardPayloadDto deserialize(UserSiteBoardData entity) {
        try {
            SiteBoardPayloadDto payload = objectMapper.readValue(entity.getPayloadJson(), PAYLOAD_TYPE);
            return normalize(payload);
        } catch (JsonProcessingException e) {
            return SiteBoardPayloadDto.empty();
        }
    }

    private String serialize(SiteBoardPayloadDto payload) {
        try {
            return objectMapper.writeValueAsString(normalize(payload));
        } catch (JsonProcessingException e) {
            throw new BadRequestException("현장 게시판 데이터 형식이 올바르지 않습니다.");
        }
    }
}
