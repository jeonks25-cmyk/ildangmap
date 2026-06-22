package com.ildangmap.config;

import com.ildangmap.domain.sitememory.SiteDictionaryEntryType;
import com.ildangmap.repository.SiteDictionaryEntryRepository;
import com.ildangmap.service.sitememory.SiteMemoryBackfillService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class SiteMemoryBackfillRunner implements ApplicationRunner {

    private final SiteDictionaryEntryRepository dictionaryRepository;
    private final SiteMemoryBackfillService backfillService;

    @Override
    public void run(ApplicationArguments args) {
        long count = dictionaryRepository.countByEntryType(SiteDictionaryEntryType.SITE);
        if (count > 0) {
            log.info("Site dictionary already populated ({} entries) — startup backfill skipped", count);
            return;
        }
        log.info("Site dictionary empty — running schedules backfill");
        backfillService.rebuildFromSchedules(false);
    }
}
