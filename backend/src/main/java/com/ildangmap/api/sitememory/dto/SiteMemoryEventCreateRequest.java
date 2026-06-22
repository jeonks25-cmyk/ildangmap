package com.ildangmap.api.sitememory.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SiteMemoryEventCreateRequest {

    @NotBlank
    private String eventType;

    private String canonicalKey;
    private String matchSource;
    private String region;
    private String craft;
    private String building;
    private String unit;
    private Boolean success;
    private Boolean userEdited;
    private String displayName;
    private String siteNameRaw;
    private String payloadHash;
    private String ocrSource;
    private Double confidence;
    private Boolean hasApartmentName;
    private Boolean hasBuilding;
    private Boolean hasUnit;
    private Boolean userEditedTitle;
    private Boolean userEditedBuilding;
    private Boolean userEditedUnit;
    private String ocrTitleOriginal;
    private String ocrTitleCorrected;
}
