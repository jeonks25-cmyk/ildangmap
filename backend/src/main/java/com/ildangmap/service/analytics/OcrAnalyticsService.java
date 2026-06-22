package com.ildangmap.service.analytics;

import com.ildangmap.api.admin.dto.OcrAnalyticsSummaryResponse;
import com.ildangmap.domain.sitememory.SiteMemoryEvent;
import com.ildangmap.domain.sitememory.SiteMemoryEventType;
import com.ildangmap.repository.SiteMemoryEventRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OcrAnalyticsService {

    private static final List<SiteMemoryEventType> OCR_ATTEMPT_TYPES =
            List.of(SiteMemoryEventType.OCR_ATTEMPT, SiteMemoryEventType.OCR_SUCCESS);
    private static final String SOURCE_VISION = "gemini-vision";
    private static final String SOURCE_TESSERACT = "tesseract-fallback";
    private static final String SOURCE_TEXT_PASTE = "text-paste";
    private static final Map<String, String> REASON_LABELS =
            Map.of(
                    "ok", "동·호 추출 완료",
                    "missing_apartment", "현장명 미추출",
                    "missing_building", "동 미추출",
                    "missing_unit", "호 미추출",
                    "structure_failed", "구조화 실패",
                    "user_edited", "사용자 제목 수정");

    private final SiteMemoryEventRepository eventRepository;

    @Transactional(readOnly = true)
    public OcrAnalyticsSummaryResponse getSummary(int days) {
        int rangeDays = Math.min(Math.max(days, 1), 365);
        Instant to = Instant.now();
        Instant from = to.minus(rangeDays, ChronoUnit.DAYS);

        long visionCount =
                eventRepository.countByOcrSourceAndTypes(SOURCE_VISION, OCR_ATTEMPT_TYPES, from, to);
        long tesseractCount =
                eventRepository.countByOcrSourceAndTypes(SOURCE_TESSERACT, OCR_ATTEMPT_TYPES, from, to);
        long textPasteCount =
                eventRepository.countByOcrSourceAndTypes(SOURCE_TEXT_PASTE, OCR_ATTEMPT_TYPES, from, to);
        long textPasteSuccess =
                eventRepository.countSuccessByOcrSourceAndTypes(SOURCE_TEXT_PASTE, OCR_ATTEMPT_TYPES, from, to);
        long textPasteEditCount = eventRepository.countEditsByOcrSource(SOURCE_TEXT_PASTE, from, to);
        long attemptCount = eventRepository.countByTypes(OCR_ATTEMPT_TYPES, from, to);
        long successCount = eventRepository.countSuccessByTypes(OCR_ATTEMPT_TYPES, from, to);
        long editCount = eventRepository.countOcrEdits(from, to);

        double successRate = attemptCount > 0 ? (double) successCount / attemptCount : 0.0;
        double editRate = successCount > 0 ? (double) editCount / successCount : 0.0;
        double textSuccessRate = textPasteCount > 0 ? (double) textPasteSuccess / textPasteCount : 0.0;
        double textEditRate =
                textPasteSuccess > 0 ? (double) textPasteEditCount / textPasteSuccess : 0.0;
        long ocrRegistrationCount = visionCount + tesseractCount;

        List<OcrAnalyticsSummaryResponse.NamedCount> topSiteNames = new ArrayList<>();
        for (Object[] row : eventRepository.topCanonicalKeys(OCR_ATTEMPT_TYPES, from, to)) {
            if (topSiteNames.size() >= 10) break;
            String name = row[0] != null ? String.valueOf(row[0]) : "";
            long count = row[1] != null ? ((Number) row[1]).longValue() : 0L;
            if (!name.isBlank()) {
                topSiteNames.add(
                        OcrAnalyticsSummaryResponse.NamedCount.builder().name(name).count(count).build());
            }
        }

        List<OcrAnalyticsSummaryResponse.FailurePatternCount> failurePatterns = buildFailurePatterns(from, to);

        List<OcrAnalyticsSummaryResponse.TitleCorrectionPair> corrections = new ArrayList<>();
        for (Object[] row : eventRepository.topTitleCorrections(from, to)) {
            if (corrections.size() >= 10) break;
            corrections.add(
                    OcrAnalyticsSummaryResponse.TitleCorrectionPair.builder()
                            .ocrTitle(String.valueOf(row[0]))
                            .correctedTitle(String.valueOf(row[1]))
                            .count(row[2] != null ? ((Number) row[2]).longValue() : 0L)
                            .build());
        }

        return OcrAnalyticsSummaryResponse.builder()
                .visionCount(visionCount)
                .tesseractFallbackCount(tesseractCount)
                .textPasteCount(textPasteCount)
                .textPasteSuccessCount(textPasteSuccess)
                .textSuccessRate(textSuccessRate)
                .textEditCount(textPasteEditCount)
                .textUserEditRate(textEditRate)
                .ocrRegistrationCount(ocrRegistrationCount)
                .ocrAttemptCount(attemptCount)
                .ocrSuccessCount(successCount)
                .ocrSuccessRate(successRate)
                .ocrEditCount(editCount)
                .userEditRate(editRate)
                .topSiteNames(topSiteNames)
                .topFailurePatterns(failurePatterns)
                .topTitleCorrections(corrections)
                .recentAttempts(buildRecentAttempts(from, to))
                .build();
    }

    private List<OcrAnalyticsSummaryResponse.RecentOcrAttempt> buildRecentAttempts(Instant from, Instant to) {
        List<SiteMemoryEvent> events =
                eventRepository.findRecentOcrEvents(
                        OCR_ATTEMPT_TYPES, from, to, PageRequest.of(0, 30));
        List<OcrAnalyticsSummaryResponse.RecentOcrAttempt> items = new ArrayList<>();
        for (SiteMemoryEvent event : events) {
            String extracted = resolveExtractedTitle(event);
            String saved = resolveSavedTitle(event, extracted);
            String source = event.getOcrSource() != null ? event.getOcrSource() : "";
            items.add(
                    OcrAnalyticsSummaryResponse.RecentOcrAttempt.builder()
                            .id(event.getId())
                            .timestamp(event.getCreatedAt())
                            .ocrSource(source)
                            .engineLabel(engineLabel(source))
                            .extractedTitle(extracted)
                            .savedTitle(saved)
                            .success(event.isSuccess())
                            .resultReason(event.getResultReason())
                            .resultReasonLabel(reasonLabel(event.getResultReason(), event.isSuccess()))
                            .confidence(event.getConfidence())
                            .build());
        }
        return items;
    }

    private String resolveExtractedTitle(SiteMemoryEvent event) {
        if (event.getOcrTitleExtracted() != null && !event.getOcrTitleExtracted().isBlank()) {
            return event.getOcrTitleExtracted();
        }
        if (event.getOcrTitleOriginal() != null && !event.getOcrTitleOriginal().isBlank()) {
            return event.getOcrTitleOriginal();
        }
        String building = event.getBuilding() != null ? event.getBuilding() : "";
        String unit = event.getUnit() != null ? event.getUnit() : "";
        if (!building.isBlank() && !unit.isBlank()) {
            String apt = event.getCanonicalKey() != null ? event.getCanonicalKey() + " " : "";
            return (apt + building + "동 " + unit + "호").trim();
        }
        return event.getCanonicalKey() != null ? event.getCanonicalKey() : "";
    }

    private String resolveSavedTitle(SiteMemoryEvent event, String extracted) {
        if (extracted == null || extracted.isBlank() || event.getUserId() == null) {
            return "";
        }
        List<SiteMemoryEvent> edits =
                eventRepository.findEditsForOriginalTitle(
                        event.getUserId(), extracted, PageRequest.of(0, 1));
        if (edits.isEmpty()) {
            return "";
        }
        SiteMemoryEvent edit = edits.get(0);
        if (edit.getOcrTitleCorrected() != null && !edit.getOcrTitleCorrected().isBlank()) {
            return edit.getOcrTitleCorrected();
        }
        return "";
    }

    private String engineLabel(String source) {
        if (SOURCE_VISION.equals(source)) {
            return "Gemini Vision";
        }
        if (SOURCE_TESSERACT.equals(source)) {
            return "Tesseract Fallback";
        }
        if (SOURCE_TEXT_PASTE.equals(source)) {
            return "텍스트 붙여넣기";
        }
        return source.isBlank() ? "—" : source;
    }

    private String reasonLabel(String reason, boolean success) {
        if (reason != null && !reason.isBlank()) {
            return REASON_LABELS.getOrDefault(reason, reason);
        }
        return success ? REASON_LABELS.get("ok") : REASON_LABELS.get("structure_failed");
    }

    private List<OcrAnalyticsSummaryResponse.FailurePatternCount> buildFailurePatterns(
            Instant from, Instant to) {
        List<OcrAnalyticsSummaryResponse.FailurePatternCount> patterns = new ArrayList<>();
        List<Object[]> totals = eventRepository.failurePatternTotals(OCR_ATTEMPT_TYPES, from, to);
        if (totals.isEmpty() || totals.get(0) == null) {
            return patterns;
        }
        Object[] row = totals.get(0);
        long missingApt = toLong(row[0]);
        long missingBuilding = toLong(row[1]);
        long missingUnit = toLong(row[2]);
        long failed = toLong(row[3]);

        addPattern(patterns, "missing_apartment", "현장명 미추출", missingApt);
        addPattern(patterns, "missing_building", "동 미추출", missingBuilding);
        addPattern(patterns, "missing_unit", "호 미추출", missingUnit);
        addPattern(patterns, "structure_failed", "구조화 실패", failed);

        patterns.sort((a, b) -> Long.compare(b.getCount(), a.getCount()));
        return patterns.stream().limit(10).toList();
    }

    private void addPattern(
            List<OcrAnalyticsSummaryResponse.FailurePatternCount> patterns,
            String key,
            String label,
            long count) {
        if (count <= 0) return;
        patterns.add(
                OcrAnalyticsSummaryResponse.FailurePatternCount.builder()
                        .pattern(key)
                        .label(label)
                        .count(count)
                        .build());
    }

    private long toLong(Object value) {
        if (value == null) return 0L;
        return ((Number) value).longValue();
    }
}
