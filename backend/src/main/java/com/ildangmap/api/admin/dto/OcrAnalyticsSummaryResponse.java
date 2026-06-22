package com.ildangmap.api.admin.dto;

import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OcrAnalyticsSummaryResponse {

    private long visionCount;
    private long tesseractFallbackCount;
    private long ocrAttemptCount;
    private long ocrSuccessCount;
    private double ocrSuccessRate;
    private long ocrEditCount;
    private double userEditRate;
    private List<NamedCount> topSiteNames;
    private List<FailurePatternCount> topFailurePatterns;
    private List<TitleCorrectionPair> topTitleCorrections;
    private List<RecentOcrAttempt> recentAttempts;

    @Getter
    @Builder
    public static class NamedCount {
        private String name;
        private long count;
    }

    @Getter
    @Builder
    public static class FailurePatternCount {
        private String pattern;
        private String label;
        private long count;
    }

    @Getter
    @Builder
    public static class TitleCorrectionPair {
        private String ocrTitle;
        private String correctedTitle;
        private long count;
    }

    @Getter
    @Builder
    public static class RecentOcrAttempt {
        private Long id;
        private LocalDateTime timestamp;
        private String ocrSource;
        private String engineLabel;
        private String extractedTitle;
        private String savedTitle;
        private boolean success;
        private String resultReason;
        private String resultReasonLabel;
        private Double confidence;
    }
}
