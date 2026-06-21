package com.ildangmap.service.place;

import com.ildangmap.api.place.dto.PlaceModerationResponse;
import com.ildangmap.api.place.dto.PlaceReportAdminItemResponse;
import com.ildangmap.api.place.dto.PlaceReportAdminListResponse;
import com.ildangmap.api.place.dto.PlaceReportAdminStatsResponse;
import com.ildangmap.domain.place.MapPlace;
import com.ildangmap.domain.place.PlaceReport;
import com.ildangmap.domain.place.PlaceStatus;
import com.ildangmap.domain.place.PlaceVerifyVote;
import com.ildangmap.domain.place.VerifyVoteType;
import com.ildangmap.repository.MapPlaceRepository;
import com.ildangmap.repository.PlaceReportRepository;
import com.ildangmap.repository.PlaceVerifyVoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PlaceModerationService {

    private static final int THRESHOLD_PENDING_REVIEW = 3;
    private static final int THRESHOLD_AUTO_HIDE = 5;
    private static final int THRESHOLD_DELETE_CANDIDATE = 10;
    private static final int VERIFY_REVIEW_MIN_WRONG = 3;

    private final MapPlaceRepository mapPlaceRepository;
    private final PlaceReportRepository placeReportRepository;
    private final PlaceVerifyVoteRepository placeVerifyVoteRepository;

    @Transactional
    public PlaceModerationResponse submitReport(String externalPlaceId, Long reporterId, String reason, String title) {
        MapPlace place = findOrCreatePlace(externalPlaceId, title);
        PlaceReport report = PlaceReport.builder()
                .place(place)
                .reporterId(reporterId)
                .reason(reason.trim())
                .build();
        placeReportRepository.save(report);

        refreshReportCount(place);
        place.touchLastReport(report.getCreatedAt());
        recalculateStatus(place);
        mapPlaceRepository.save(place);

        return toResponse(place, reporterId);
    }

    @Transactional
    public PlaceModerationResponse submitVerify(String externalPlaceId, Long voterId, VerifyVoteType vote, String title) {
        MapPlace place = findOrCreatePlace(externalPlaceId, title);
        PlaceVerifyVote existing = placeVerifyVoteRepository.findByPlaceIdAndVoterId(place.getId(), voterId)
                .orElse(null);
        if (existing != null) {
            existing.changeVote(vote);
        } else {
            placeVerifyVoteRepository.save(PlaceVerifyVote.builder()
                    .place(place)
                    .voterId(voterId)
                    .vote(vote)
                    .build());
        }

        refreshVerifyCounts(place);
        recalculateStatus(place);
        mapPlaceRepository.save(place);

        return toResponse(place, voterId);
    }

    @Transactional(readOnly = true)
    public PlaceModerationResponse getModeration(String externalPlaceId, Long viewerId) {
        MapPlace place = mapPlaceRepository.findByExternalIdAndDeletedFalse(externalPlaceId).orElse(null);
        if (place == null) {
            return PlaceModerationResponse.builder()
                    .placeId(externalPlaceId)
                    .status(PlaceStatus.ACTIVE)
                    .reportCount(0)
                    .correctCount(0)
                    .incorrectCount(0)
                    .build();
        }
        return toResponse(place, viewerId);
    }

    @Transactional(readOnly = true)
    public Map<String, PlaceStatus> listNonPublicStatuses() {
        return mapPlaceRepository.findAll().stream()
                .filter(place -> !place.isDeleted())
                .filter(place -> place.getStatus() != PlaceStatus.ACTIVE)
                .collect(Collectors.toMap(MapPlace::getExternalId, MapPlace::getStatus, (a, b) -> a));
    }

    @Transactional(readOnly = true)
    public PlaceReportAdminListResponse listForAdmin(String sort) {
        List<MapPlace> places = mapPlaceRepository.findAll().stream()
                .filter(place -> !place.isDeleted())
                .filter(place -> place.getReportCount() > 0 || place.getStatus() != PlaceStatus.ACTIVE)
                .sorted(resolveAdminSort(sort))
                .toList();

        List<PlaceReportAdminItemResponse> items = places.stream()
                .map(place -> {
                    String latestReason = placeReportRepository.findTopByPlaceIdOrderByCreatedAtDesc(place.getId())
                            .map(PlaceReport::getReason)
                            .orElse(null);
                    return PlaceReportAdminItemResponse.of(place, latestReason);
                })
                .toList();

        PlaceReportAdminStatsResponse stats = PlaceReportAdminStatsResponse.builder()
                .totalPlaces(mapPlaceRepository.countByDeletedFalse())
                .pendingReview(mapPlaceRepository.countByStatusAndDeletedFalse(PlaceStatus.PENDING_REVIEW))
                .hidden(mapPlaceRepository.countByStatusAndDeletedFalse(PlaceStatus.HIDDEN))
                .deleteCandidate(mapPlaceRepository.countByStatusAndDeletedFalse(PlaceStatus.DELETE_CANDIDATE))
                .build();

        return PlaceReportAdminListResponse.builder()
                .stats(stats)
                .items(items)
                .build();
    }

    @Transactional
    public PlaceModerationResponse updateStatusByAdmin(String externalPlaceId, PlaceStatus status) {
        MapPlace place = mapPlaceRepository.findByExternalIdAndDeletedFalse(externalPlaceId)
                .orElseGet(() -> findOrCreatePlace(externalPlaceId, ""));
        place.lockAdminStatus(status);
        mapPlaceRepository.save(place);
        return toResponse(place, null);
    }

    @Transactional
    public PlaceModerationResponse deleteByAdmin(String externalPlaceId) {
        MapPlace place = mapPlaceRepository.findByExternalIdAndDeletedFalse(externalPlaceId)
                .orElseGet(() -> findOrCreatePlace(externalPlaceId, ""));
        place.markDeleted();
        mapPlaceRepository.save(place);
        return toResponse(place, null);
    }

    private MapPlace findOrCreatePlace(String externalPlaceId, String title) {
        return mapPlaceRepository.findByExternalId(externalPlaceId)
                .map(existing -> {
                    if (title != null && !title.isBlank()) {
                        existing.updateTitle(title);
                    }
                    return existing;
                })
                .orElseGet(() -> mapPlaceRepository.save(MapPlace.builder()
                        .externalId(externalPlaceId)
                        .title(title != null ? title : "")
                        .build()));
    }

    private void refreshReportCount(MapPlace place) {
        long count = placeReportRepository.countByPlaceId(place.getId());
        place.applyCounts((int) count, place.getCorrectCount(), place.getIncorrectCount());
    }

    private void refreshVerifyCounts(MapPlace place) {
        long correct = placeVerifyVoteRepository.countByPlaceIdAndVote(place.getId(), VerifyVoteType.CORRECT);
        long incorrect = placeVerifyVoteRepository.countByPlaceIdAndVote(place.getId(), VerifyVoteType.INCORRECT);
        place.applyCounts(place.getReportCount(), (int) correct, (int) incorrect);
    }

    private void recalculateStatus(MapPlace place) {
        if (place.isAdminLocked() || place.isDeleted()) {
            return;
        }

        int reportCount = place.getReportCount();
        int correct = place.getCorrectCount();
        int incorrect = place.getIncorrectCount();

        PlaceStatus next = PlaceStatus.ACTIVE;
        if (reportCount >= THRESHOLD_DELETE_CANDIDATE) {
            next = PlaceStatus.DELETE_CANDIDATE;
        } else if (reportCount >= THRESHOLD_AUTO_HIDE) {
            next = PlaceStatus.HIDDEN;
        } else if (reportCount >= THRESHOLD_PENDING_REVIEW) {
            next = PlaceStatus.PENDING_REVIEW;
        } else if (incorrect >= VERIFY_REVIEW_MIN_WRONG && incorrect > correct) {
            next = PlaceStatus.PENDING_REVIEW;
        }
        place.applyStatus(next);
    }

    private PlaceModerationResponse toResponse(MapPlace place, Long viewerId) {
        VerifyVoteType myVote = null;
        if (viewerId != null) {
            myVote = placeVerifyVoteRepository.findByPlaceIdAndVoterId(place.getId(), viewerId)
                    .map(PlaceVerifyVote::getVote)
                    .orElse(null);
        }
        return PlaceModerationResponse.from(place, myVote);
    }

    private Comparator<MapPlace> resolveAdminSort(String sort) {
        String normalized = sort != null ? sort.trim().toLowerCase(Locale.ROOT) : "reports";
        if ("recent".equals(normalized)) {
            return Comparator.comparing(
                    MapPlace::getLastReportAt,
                    Comparator.nullsLast(Comparator.reverseOrder())
            );
        }
        return Comparator
                .comparingInt(MapPlace::getReportCount).reversed()
                .thenComparing(MapPlace::getLastReportAt, Comparator.nullsLast(Comparator.reverseOrder()));
    }
}
