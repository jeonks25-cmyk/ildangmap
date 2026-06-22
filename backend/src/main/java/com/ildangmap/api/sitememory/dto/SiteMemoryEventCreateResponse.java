package com.ildangmap.api.sitememory.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SiteMemoryEventCreateResponse {

    private final boolean recorded;
    private final String canonicalKey;
}
