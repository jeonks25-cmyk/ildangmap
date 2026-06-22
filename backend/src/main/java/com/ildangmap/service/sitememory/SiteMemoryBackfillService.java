package com.ildangmap.service.sitememory;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ildangmap.api.sitememory.dto.SiteMemoryBackfillResponse;
import com.ildangmap.api.user.dto.SchedulesPayloadDto;
import com.ildangmap.domain.schedule.UserSchedulesData;
import com.ildangmap.domain.sitememory.SiteDictionaryEntry;
import com.ildangmap.domain.sitememory.SiteDictionaryEntryType;
import com.ildangmap.repository.SiteDictionaryEntryRepository;
import com.ildangmap.repository.UserSchedulesDataRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class SiteMemoryBackfillService {

    private static final TypeReference<SchedulesPayloadDto> PAYLOAD_TYPE = new TypeReference<>() {};

    private final UserSchedulesDataRepository schedulesDataRepository;
    private final SiteDictionaryEntryRepository dictionaryRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public SiteMemoryBackfillResponse rebuildFromSchedules(boolean force) {
        long existing = dictionaryRepository.countByEntryType(SiteDictionaryEntryType.SITE);
        if (!force && existing > 0) {
            return SiteMemoryBackfillResponse.builder()
                    .processedUsers(0)
                    .processedSchedules(0)
                    .dictionaryEntries(existing)
                    .skipped(true)
                    .message("기존 사전 데이터가 있어 백필을 건너뛰었습니다. 강제 재구축은 force=true")
                    .build();
        }

        Map<String, Aggregate> aggregates = new LinkedHashMap<>();
        long processedUsers = 0;
        long processedSchedules = 0;

        List<UserSchedulesData> rows = schedulesDataRepository.findAll();
        for (UserSchedulesData row : rows) {
            processedUsers++;
            SchedulesPayloadDto payload = deserialize(row.getPayloadJson());
            if (payload.getSchedules() == null) continue;

            for (Map<String, Object> schedule : payload.getSchedules()) {
                if (schedule == null || schedule.isEmpty()) continue;
                String title = stringField(schedule, "title");
                if (title.isBlank()) {
                    title = stringField(schedule, "siteLabel");
                }
                SiteTitleParser.SiteTitleParts parts = SiteTitleParser.parse(title);
                if (parts.siteName().isBlank()) continue;

                processedSchedules++;
                String key = SiteTitleParser.canonicalKey(parts.siteName());
                Aggregate aggregate = aggregates.computeIfAbsent(key, ignored -> new Aggregate(parts.siteName()));
                aggregate.count++;
                aggregate.bumpRegion(stringField(schedule, "shortRegion"), stringField(schedule, "shortAddress"), stringField(schedule, "region"));
                aggregate.bumpBuilding(parts.building());
                aggregate.bumpCraft(stringField(schedule, "craft"));
            }
        }

        if (force) {
            dictionaryRepository.deleteByEntryType(SiteDictionaryEntryType.SITE);
        }

        for (Aggregate aggregate : aggregates.values()) {
            SiteDictionaryEntry entry = dictionaryRepository.findByCanonicalKey(aggregate.canonicalKey).orElseGet(() ->
                    SiteDictionaryEntry.builder()
                            .canonicalKey(aggregate.canonicalKey)
                            .displayName(aggregate.displayName)
                            .entryType(SiteDictionaryEntryType.SITE)
                            .registrationCount(0)
                            .metaJson("{}")
                            .build()
            );
            entry.replaceFromBackfill(
                    aggregate.displayName,
                    aggregate.topRegion(),
                    aggregate.count,
                    aggregate.meta.toJson(objectMapper)
            );
            dictionaryRepository.save(entry);
        }

        long entries = dictionaryRepository.countByEntryType(SiteDictionaryEntryType.SITE);
        log.info(
                "Site memory backfill complete users={} schedules={} entries={}",
                processedUsers,
                processedSchedules,
                entries
        );

        return SiteMemoryBackfillResponse.builder()
                .processedUsers(processedUsers)
                .processedSchedules(processedSchedules)
                .dictionaryEntries(entries)
                .skipped(false)
                .message("일정 데이터 백필 완료")
                .build();
    }

    private SchedulesPayloadDto deserialize(String json) {
        try {
            SchedulesPayloadDto payload = objectMapper.readValue(json, PAYLOAD_TYPE);
            return payload != null ? payload : SchedulesPayloadDto.empty();
        } catch (Exception e) {
            return SchedulesPayloadDto.empty();
        }
    }

    private static String stringField(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value == null ? "" : String.valueOf(value).trim();
    }

    private static final class Aggregate {
        private final String canonicalKey;
        private final String displayName;
        private long count;
        private final Map<String, Long> regionCounts = new LinkedHashMap<>();
        private final SiteDictionaryMeta meta = SiteDictionaryMeta.empty();

        private Aggregate(String displayName) {
            this.displayName = displayName;
            this.canonicalKey = SiteTitleParser.canonicalKey(displayName);
        }

        private void bumpRegion(String... regions) {
            for (String region : regions) {
                if (region == null || region.isBlank()) continue;
                String city = region.split("\\s+")[0].trim();
                if (city.isBlank()) continue;
                regionCounts.put(city, regionCounts.getOrDefault(city, 0L) + 1L);
            }
        }

        private void bumpBuilding(String building) {
            meta.bumpBuilding(building);
        }

        private void bumpCraft(String craft) {
            meta.bumpCraft(craft);
        }

        private String topRegion() {
            return regionCounts.entrySet().stream()
                    .max(Map.Entry.comparingByValue())
                    .map(Map.Entry::getKey)
                    .orElse("");
        }
    }
}
