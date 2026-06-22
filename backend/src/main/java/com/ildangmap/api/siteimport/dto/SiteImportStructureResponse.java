package com.ildangmap.api.siteimport.dto;

import java.util.ArrayList;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SiteImportStructureResponse {

    private String title;
    private String apartmentName;
    private String building;
    private String unit;
    private String commonPassword;
    private String housePassword;
    @Builder.Default
    private List<String> workItems = new ArrayList<>();
    private double confidence;
    private String source;

    public boolean hasUnit() {
        return building != null && !building.isBlank() && unit != null && !unit.isBlank();
    }
}
