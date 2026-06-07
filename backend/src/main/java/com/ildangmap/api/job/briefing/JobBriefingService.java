package com.ildangmap.api.job.briefing;

import com.ildangmap.api.job.briefing.dto.BriefingParticipantResponse;
import com.ildangmap.api.job.briefing.dto.BriefingPostCreateRequest;
import com.ildangmap.api.job.briefing.dto.BriefingPostResponse;
import com.ildangmap.api.job.briefing.dto.BriefingRoomResponse;
import com.ildangmap.domain.application.JobApplication;
import com.ildangmap.domain.application.JobApplicationStatus;
import com.ildangmap.domain.briefing.BriefingPostType;
import com.ildangmap.domain.briefing.JobBriefingPost;
import com.ildangmap.domain.briefing.JobBriefingRoom;
import com.ildangmap.domain.job.Job;
import com.ildangmap.domain.user.User;
import com.ildangmap.global.exception.BadRequestException;
import com.ildangmap.global.exception.ForbiddenException;
import com.ildangmap.global.exception.ResourceNotFoundException;
import com.ildangmap.global.exception.UnauthorizedException;
import com.ildangmap.repository.JobApplicationRepository;
import com.ildangmap.repository.JobBriefingPostRepository;
import com.ildangmap.repository.JobBriefingRoomRepository;
import com.ildangmap.repository.JobRepository;
import com.ildangmap.repository.UserRepository;
import com.ildangmap.service.SessionUserService;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class JobBriefingService {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final JobRepository jobRepository;
    private final JobApplicationRepository jobApplicationRepository;
    private final JobBriefingRoomRepository jobBriefingRoomRepository;
    private final JobBriefingPostRepository jobBriefingPostRepository;
    private final UserRepository userRepository;
    private final SessionUserService sessionUserService;

    @Transactional(readOnly = true)
    public BriefingRoomResponse getBriefingRoom(Long jobId) {
        Long viewerId = requireParticipantUserId(jobId);
        Job job = loadJob(jobId);
        assertParticipant(job, viewerId);
        return buildRoomResponse(job, jobBriefingRoomRepository.findByJob_Id(job.getId()));
    }

    @Transactional(readOnly = true)
    public List<BriefingPostResponse> listPosts(Long jobId) {
        Long viewerId = requireParticipantUserId(jobId);
        Job job = loadJob(jobId);
        assertParticipant(job, viewerId);
        return jobBriefingRoomRepository.findByJob_Id(job.getId())
                .map(room -> jobBriefingPostRepository.findByRoom_IdOrderByCreatedAtDesc(room.getId()).stream()
                        .map(this::toPostResponse)
                        .toList())
                .orElseGet(List::of);
    }

    @Transactional
    public BriefingPostResponse createPost(Long jobId, BriefingPostCreateRequest request) {
        Long viewerId = requireParticipantUserId(jobId);
        Job job = loadJob(jobId);
        assertParticipant(job, viewerId);
        User author = userRepository.findById(viewerId)
                .orElseThrow(() -> new BadRequestException("사용자 정보를 찾을 수 없습니다."));
        JobBriefingRoom room = ensureBriefingRoom(job);
        BriefingPostType type = parsePostType(request.getPostType());
        String body = StringUtils.hasText(request.getBody()) ? request.getBody().trim() : "";
        if (body.isEmpty()) {
            throw new BadRequestException("내용을 입력해 주세요.");
        }
        String image = normalizeImageDataUrl(request.getImageDataUrl());
        validateOptionalImage(image);
        JobBriefingPost saved = jobBriefingPostRepository.save(
                JobBriefingPost.builder()
                        .room(room)
                        .authorUserId(viewerId)
                        .authorName(resolveAuthorDisplayName(author))
                        .body(body)
                        .postType(type)
                        .imageDataUrl(image)
                        .build()
        );
        return toPostResponse(saved);
    }

    private Long requireParticipantUserId(Long jobId) {
        Optional<Long> uid = sessionUserService.resolveCurrentUserId();
        if (uid.isEmpty()) {
            throw new UnauthorizedException("로그인이 필요합니다.");
        }
        return uid.get();
    }

    private Job loadJob(Long jobId) {
        return jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("공고를 찾을 수 없습니다."));
    }

    private void assertParticipant(Job job, Long userId) {
        if (job.getOwnerUserId().equals(userId)) {
            return;
        }
        if (jobApplicationRepository.existsByJobIdAndApplicantUserIdAndStatus(
                job.getId(), userId, JobApplicationStatus.ACCEPTED)) {
            return;
        }
        throw new ForbiddenException("이 현장의 참여자만 브리핑룸을 볼 수 있습니다.");
    }

    @Transactional
    public JobBriefingRoom ensureBriefingRoom(Job job) {
        return jobBriefingRoomRepository.findByJob_Id(job.getId()).orElseGet(() ->
                jobBriefingRoomRepository.save(JobBriefingRoom.builder().job(job).build())
        );
    }

    private BriefingRoomResponse buildRoomResponse(Job job, Optional<JobBriefingRoom> roomOpt) {
        List<BriefingParticipantResponse> participants = buildParticipants(job);
        String entry = roomOpt.map(JobBriefingRoom::getEntryInfo).filter(StringUtils::hasText).orElse(null);
        if (!StringUtils.hasText(entry)) {
            entry = StringUtils.hasText(job.getLocationText())
                    ? job.getLocationText()
                    : "등록된 출입·집결 안내가 없습니다. 피드에 남겨 주세요.";
        }
        String parking = roomOpt.map(JobBriefingRoom::getParkingInfo).filter(StringUtils::hasText).orElse(null);
        if (!StringUtils.hasText(parking)) {
            parking = job.isParkingAvailable()
                    ? "현장은 주차 가능으로 등록되어 있어요. 상세 위치는 피드로 공유해 주세요."
                    : "주차 불가 또는 미등록 현장이에요. 피드로 안내해 주세요.";
        }
        String work = roomOpt.map(JobBriefingRoom::getWorkSummary).filter(StringUtils::hasText).orElse(null);
        if (!StringUtils.hasText(work)) {
            String t = StringUtils.hasText(job.getTrade()) ? job.getTrade().trim() : "";
            String r = StringUtils.hasText(job.getRole()) ? job.getRole().trim() : "";
            String both = (t + " " + r).trim();
            work = StringUtils.hasText(both) ? both + " · " + job.getTitle() : job.getTitle();
        }
        return BriefingRoomResponse.builder()
                .jobId(job.getId())
                .title(job.getTitle())
                .workDate(job.getWorkDate())
                .startTime(job.getStartTime())
                .endTime(job.getEndTime())
                .shortAddress(job.getShortAddress())
                .fullAddress(job.getFullAddress())
                .lat(job.getLat())
                .lng(job.getLng())
                .parkingAvailable(job.isParkingAvailable())
                .trade(job.getTrade())
                .role(job.getRole())
                .entryInfo(entry)
                .parkingInfo(parking)
                .workSummary(work)
                .participants(participants)
                .build();
    }

    private List<BriefingParticipantResponse> buildParticipants(Job job) {
        List<BriefingParticipantResponse> list = new ArrayList<>();
        userRepository.findById(job.getOwnerUserId()).ifPresent(u ->
                list.add(BriefingParticipantResponse.builder()
                        .userId(u.getId())
                        .displayName(resolveAuthorDisplayName(u))
                        .roleTag("오야지")
                        .build())
        );
        List<JobApplication> apps = jobApplicationRepository.findByJobIdOrderByIdAsc(job.getId());
        for (JobApplication app : apps) {
            if (app.getStatus() != JobApplicationStatus.ACCEPTED) {
                continue;
            }
            userRepository.findById(app.getApplicantUserId()).ifPresent(u ->
                    list.add(BriefingParticipantResponse.builder()
                            .userId(u.getId())
                            .displayName(resolveAuthorDisplayName(u))
                            .roleTag(StringUtils.hasText(app.getRole()) ? app.getRole() : job.getRole())
                            .build())
            );
        }
        list.sort(Comparator.comparing(BriefingParticipantResponse::getUserId));
        return list;
    }

    private BriefingPostResponse toPostResponse(JobBriefingPost post) {
        String img = post.getImageDataUrl();
        if (img != null && img.isBlank()) {
            img = null;
        }
        return BriefingPostResponse.builder()
                .id(post.getId())
                .body(post.getBody())
                .postType(toWireType(post.getPostType()))
                .authorUserId(post.getAuthorUserId())
                .authorName(post.getAuthorName())
                .createdAt(post.getCreatedAt() != null ? post.getCreatedAt().atZone(SEOUL).toInstant() : null)
                .imageDataUrl(img)
                .build();
    }

    private static String normalizeImageDataUrl(String raw) {
        if (!StringUtils.hasText(raw)) {
            return null;
        }
        String s = raw.trim();
        return s.isEmpty() ? null : s;
    }

    private static void validateOptionalImage(String image) {
        if (image == null) {
            return;
        }
        if (image.length() > 200_000) {
            throw new BadRequestException("첨부 이미지가 너무 큽니다. (최대 약 200KB 수준의 data URL)");
        }
        if (!image.startsWith("data:image/jpeg")
                && !image.startsWith("data:image/png")
                && !image.startsWith("data:image/webp")) {
            throw new BadRequestException("첨부는 JPEG, PNG, WebP data URL만 지원합니다.");
        }
    }

    private static String toWireType(BriefingPostType type) {
        if (type == null) {
            return "general";
        }
        return switch (type) {
            case GENERAL -> "general";
            case CHANGE -> "change";
            case HELP_REQUEST -> "help_request";
        };
    }

    private static BriefingPostType parsePostType(String raw) {
        if (!StringUtils.hasText(raw)) {
            return BriefingPostType.GENERAL;
        }
        String s = raw.trim().toLowerCase(Locale.ROOT);
        return switch (s) {
            case "change", "changed", "변경" -> BriefingPostType.CHANGE;
            case "help_request", "help", "도움" -> BriefingPostType.HELP_REQUEST;
            default -> BriefingPostType.GENERAL;
        };
    }

    private static String resolveAuthorDisplayName(User user) {
        if (user == null) {
            return "현장 기공";
        }
        if (user.hasDisplayNickname()) {
            return user.getDisplayNickname();
        }
        return "현장 기공";
    }
}
