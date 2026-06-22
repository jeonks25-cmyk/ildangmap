package com.ildangmap.api.sitememory.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SiteMemoryBackfillResponse {

    private final long processedUsers;
    private final long processedSchedules;
    private final long dictionaryEntries;
    private final boolean skipped;
    private final String message;
}
