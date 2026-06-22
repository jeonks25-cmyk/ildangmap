package com.ildangmap.service.sitememory;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ildangmap.api.sitememory.dto.SiteMemoryCandidateResponse;
import com.ildangmap.api.sitememory.dto.SiteMemoryEventCreateRequest;
import com.ildangmap.api.sitememory.dto.SiteMemoryEventCreateResponse;
import com.ildangmap.api.sitememory.dto.SiteMemoryMatchResponse;
import com.ildangmap.domain.sitememory.SiteDictionaryEntry;
import com.ildangmap.domain.sitememory.SiteDictionaryEntryType;
import com.ildangmap.domain.sitememory.SiteMemoryEvent;
import com.ildangmap.domain.sitememory.SiteMemoryEventType;
import com.ildangmap.domain.sitememory.SiteMemoryMatchSource;
import com.ildangmap.global.exception.BadRequestException;
import com.ildangmap.repository.SiteDictionaryEntryRepository;
import com.ildangmap.repository.SiteMemoryEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SiteMemoryService {

    private static final int DEFAULT_MATCH_LIMIT = 5;

    private final SiteDictionaryEntryRepository dictionaryRepository;
    private final SiteMemoryEventRepository eventRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public SiteMemoryMatchResponse match(String query, String building, String region, String craft, int limit) {
        String token = SiteTitleParser.compactHangul(query);
        if (token.length() < 2) {
            return SiteMemoryMatchResponse.builder().candidates(List.of()).total(0).build();
        }

        int max = Math.min(Math.max(limit, 1), 10);
        Map<String, ScoredEntry> scored = new LinkedHashMap<>();

        dictionaryRepository.findByCanonicalKey(token).ifPresent(entry -> {
            scored.put(entry.getCanonicalKey(), scoreEntry(entry, token, building, region, craft, 0.96));
        });

        for (SiteDictionaryEntry entry : dictionaryRepository.searchByToken(
                SiteDictionaryEntryType.SITE,
                token,
                PageRequest.of(0, max * 3)
        )) {
            scored.putIfAbsent(
                    entry.getCanonicalKey(),
                    scoreEntry(entry, token, building, region, craft, null)
            );
        }

        List<SiteDictionaryEntry> popular = dictionaryRepository.findByEntryTypeOrderByRegistrationCountDesc(
                SiteDictionaryEntryType.SITE,
                PageRequest.of(0, max * 2)
        );
        for (SiteDictionaryEntry entry : popular) {
            if (scored.containsKey(entry.getCanonicalKey())) continue;
            ScoredEntry candidate = scoreEntry(entry, token, building, region, craft, null);
            if (candidate.score() >= 0.55) {
                scored.put(entry.getCanonicalKey(), candidate);
            }
        }

        List<SiteMemoryCandidateResponse> candidates = scored.values().stream()
                .sorted(Comparator.comparingDouble(ScoredEntry::score).reversed())
                .limit(max)
                .map(this::toCandidate)
                .toList();

        return SiteMemoryMatchResponse.builder()
                .candidates(candidates)
                .total(candidates.size())
                .build();
    }

    @Transactional
    public SiteMemoryEventCreateResponse recordEvent(Long userId, SiteMemoryEventCreateRequest request) {
        SiteMemoryEventType eventType = parseEventType(request.getEventType());
        SiteMemoryMatchSource matchSource = parseMatchSource(request.getMatchSource());

        String siteName = firstNonBlank(request.getDisplayName(), request.getCanonicalKey());
        SiteTitleParser.SiteTitleParts parts = SiteTitleParser.parse(
                firstNonBlank(siteName, request.getSiteNameRaw())
        );
        String canonicalKey = firstNonBlank(
                request.getCanonicalKey(),
                SiteTitleParser.canonicalKey(parts.siteName())
        );

        if (eventType == SiteMemoryEventType.REGISTRATION && !canonicalKey.isBlank()) {
            upsertDictionary(
                    canonicalKey,
                    parts.siteName(),
                    request.getRegion(),
                    firstNonBlank(request.getBuilding(), parts.building()),
                    request.getCraft(),
                    1
            );
        }

        String payloadHash = firstNonBlank(
                request.getPayloadHash(),
                hashPayload(request.getSiteNameRaw())
        );

        eventRepository.save(
                SiteMemoryEvent.builder()
                        .userId(userId)
                        .eventType(eventType)
                        .canonicalKey(blankToNull(canonicalKey))
                        .matchSource(matchSource)
                        .region(blankToNull(request.getRegion()))
                        .craft(blankToNull(request.getCraft()))
                        .building(blankToNull(firstNonBlank(request.getBuilding(), parts.building())))
                        .unit(blankToNull(firstNonBlank(request.getUnit(), parts.unit())))
                        .success(Boolean.TRUE.equals(request.getSuccess()))
                        .userEdited(Boolean.TRUE.equals(request.getUserEdited())
                                || Boolean.TRUE.equals(request.getUserEditedTitle())
                                || Boolean.TRUE.equals(request.getUserEditedBuilding())
                                || Boolean.TRUE.equals(request.getUserEditedUnit()))
                        .payloadHash(blankToNull(payloadHash))
                        .ocrSource(blankToNull(request.getOcrSource()))
                        .confidence(request.getConfidence())
                        .hasApartmentName(request.getHasApartmentName())
                        .hasBuilding(request.getHasBuilding())
                        .hasUnit(request.getHasUnit())
                        .userEditedTitle(request.getUserEditedTitle())
                        .userEditedBuilding(request.getUserEditedBuilding())
                        .userEditedUnit(request.getUserEditedUnit())
                        .ocrTitleOriginal(blankToNull(request.getOcrTitleOriginal()))
                        .ocrTitleCorrected(blankToNull(request.getOcrTitleCorrected()))
                        .ocrTitleExtracted(blankToNull(firstNonBlank(
                                request.getOcrTitleExtracted(), request.getOcrTitleOriginal())))
                        .resultReason(blankToNull(request.getResultReason()))
                        .build()
        );

        return SiteMemoryEventCreateResponse.builder()
                .recorded(true)
                .canonicalKey(canonicalKey)
                .build();
    }

    @Transactional
    public SiteDictionaryEntry upsertDictionary(
            String canonicalKey,
            String displayName,
            String region,
            String building,
            String craft,
            long increment
    ) {
        if (canonicalKey == null || canonicalKey.isBlank()) {
            throw new BadRequestException("현장 키가 비어 있습니다.");
        }
        String key = SiteTitleParser.canonicalKey(canonicalKey);
        if (key.isBlank()) {
            throw new BadRequestException("현장 키가 비어 있습니다.");
        }

        SiteDictionaryEntry entry = dictionaryRepository.findByCanonicalKey(key).orElseGet(() ->
                SiteDictionaryEntry.builder()
                        .canonicalKey(key)
                        .displayName(firstNonBlank(displayName, key))
                        .entryType(SiteDictionaryEntryType.SITE)
                        .region(region)
                        .registrationCount(0)
                        .metaJson("{}")
                        .build()
        );

        SiteDictionaryMeta meta = SiteDictionaryMeta.fromJson(objectMapper, entry.getMetaJson());
        meta.bumpBuilding(building);
        meta.bumpCraft(craft);
        if (displayName != null && !displayName.isBlank() && !displayName.equals(entry.getDisplayName())) {
            meta.addAlias(displayName.trim());
        }

        entry.recordVisit(displayName, region, building, craft, increment);
        entry.updateMetaJson(meta.toJson(objectMapper));
        return dictionaryRepository.save(entry);
    }

    private ScoredEntry scoreEntry(
            SiteDictionaryEntry entry,
            String token,
            String building,
            String region,
            String craft,
            Double baseOverride
    ) {
        double score = baseOverride != null ? baseOverride : similarity(token, entry.getCanonicalKey(), entry.getDisplayName());
        SiteDictionaryMeta meta = SiteDictionaryMeta.fromJson(objectMapper, entry.getMetaJson());

        if (building != null && !building.isBlank() && meta.hasBuilding(building.trim())) {
            score += 0.1;
        }
        if (region != null && !region.isBlank() && entry.getRegion() != null && entry.getRegion().contains(region.trim())) {
            score += 0.08;
        }
        if (craft != null && !craft.isBlank() && meta.getCrafts().containsKey(craft.trim())) {
            score += 0.05;
        }
        score += Math.min(0.12, entry.getRegistrationCount() / 200.0);

        String detail = "등록 " + entry.getRegistrationCount() + "회";
        if (entry.getRegion() != null && !entry.getRegion().isBlank()) {
            detail += " · " + entry.getRegion();
        }

        return new ScoredEntry(entry, Math.min(0.99, score), detail);
    }

    private SiteMemoryCandidateResponse toCandidate(ScoredEntry scored) {
        SiteDictionaryEntry entry = scored.entry();
        return SiteMemoryCandidateResponse.builder()
                .name(entry.getDisplayName())
                .canonicalKey(entry.getCanonicalKey())
                .registrationCount(entry.getRegistrationCount())
                .score(scored.score())
                .scorePercent((int) Math.round(Math.min(99, scored.score() * 100)))
                .region(entry.getRegion())
                .detail(scored.detail())
                .source("global")
                .build();
    }

    private double similarity(String token, String canonicalKey, String displayName) {
        if (token.equals(canonicalKey)) return 0.95;
        if (canonicalKey.contains(token) || token.contains(canonicalKey)) {
            double shorter = Math.min(token.length(), canonicalKey.length());
            double longer = Math.max(token.length(), canonicalKey.length());
            return 0.72 + (shorter / longer) * 0.2;
        }
        String displayCompact = SiteTitleParser.compactHangul(displayName);
        if (!displayCompact.isEmpty() && (displayCompact.contains(token) || token.contains(displayCompact))) {
            return 0.68;
        }
        return Math.max(0, 1.0 - levenshteinRatio(token, canonicalKey));
    }

    private double levenshteinRatio(String left, String right) {
        int dist = levenshtein(left, right);
        int max = Math.max(left.length(), right.length());
        return max == 0 ? 0 : (double) dist / max;
    }

    private int levenshtein(String a, String b) {
        int[][] matrix = new int[a.length() + 1][b.length() + 1];
        for (int i = 0; i <= a.length(); i++) matrix[i][0] = i;
        for (int j = 0; j <= b.length(); j++) matrix[0][j] = j;
        for (int i = 1; i <= a.length(); i++) {
            for (int j = 1; j <= b.length(); j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                matrix[i][j] = Math.min(
                        Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1),
                        matrix[i - 1][j - 1] + cost
                );
            }
        }
        return matrix[a.length()][b.length()];
    }

    private SiteMemoryEventType parseEventType(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new BadRequestException("eventType이 필요합니다.");
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT).replace('-', '_');
        try {
            return SiteMemoryEventType.valueOf(normalized);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("지원하지 않는 eventType입니다: " + raw);
        }
    }

    private SiteMemoryMatchSource parseMatchSource(String raw) {
        if (raw == null || raw.isBlank()) {
            return SiteMemoryMatchSource.NONE;
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        try {
            return SiteMemoryMatchSource.valueOf(normalized);
        } catch (IllegalArgumentException e) {
            return SiteMemoryMatchSource.NONE;
        }
    }

    static String hashPayload(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(raw.trim().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException e) {
            return null;
        }
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) return value.trim();
        }
        return "";
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private record ScoredEntry(SiteDictionaryEntry entry, double score, String detail) {}
}
