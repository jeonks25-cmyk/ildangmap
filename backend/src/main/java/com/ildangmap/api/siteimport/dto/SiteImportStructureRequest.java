package com.ildangmap.api.siteimport.dto;

import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SiteImportStructureRequest {

    private String text;
    private RuleHint ruleHint;

    @Getter
    @Setter
    public static class RuleHint {
        private String apartmentName;
        private String building;
        private String unit;
        private String commonPassword;
        private String housePassword;
        private List<String> workItems;
        private Double confidence;
    }
}
