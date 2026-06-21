package com.ildangmap.api.feedback.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class BetaFeedbackAdminListResponse {

    private final List<BetaFeedbackAdminItemResponse> items;
    private final int page;
    private final int size;
    private final long totalElements;
    private final int totalPages;
    private final List<SimilarGroupSummary> topSimilarGroups;

    @Getter
    @Builder
    public static class SimilarGroupSummary {
        private final String similarityGroupKey;
        private final long count;
    }
}
