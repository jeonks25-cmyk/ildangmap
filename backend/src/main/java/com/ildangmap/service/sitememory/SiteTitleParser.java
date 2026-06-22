package com.ildangmap.service.sitememory;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class SiteTitleParser {

    private static final Pattern DONG_HO_COMPACT = Pattern.compile("(\\d{3,4})동(\\d{2,4})호");
    private static final Pattern DONG_HO_SPACED = Pattern.compile("(\\d{3,4})\\s*동\\s*(\\d{2,4})\\s*호");
    private static final Pattern APT_SUFFIX = Pattern.compile("(아파트|APT|apt|오피스텔|빌라|빌딩|타워|단지)$", Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    private SiteTitleParser() {}

    public record SiteTitleParts(String siteName, String building, String unit, String rawTitle) {}

    public static SiteTitleParts parse(String title) {
        String raw = String.valueOf(title == null ? "" : title).trim();
        if (raw.isEmpty()) {
            return new SiteTitleParts("", "", "", "");
        }

        String compact = raw.replaceAll("\\s+", "");
        Matcher compactMatch = DONG_HO_COMPACT.matcher(compact);
        if (compactMatch.find()) {
            String building = digitsOnly(compactMatch.group(1));
            String unit = digitsOnly(compactMatch.group(2));
            String siteName = stripSiteSuffix(compact.substring(0, compactMatch.start()));
            return new SiteTitleParts(siteName, building, unit, raw);
        }

        Matcher spacedMatch = DONG_HO_SPACED.matcher(raw);
        if (spacedMatch.find()) {
            String building = digitsOnly(spacedMatch.group(1));
            String unit = digitsOnly(spacedMatch.group(2));
            String siteName = stripSiteSuffix(raw.substring(0, spacedMatch.start()).replaceAll("\\s+", ""));
            return new SiteTitleParts(siteName, building, unit, raw);
        }

        return new SiteTitleParts(stripSiteSuffix(compact), "", "", raw);
    }

    public static String canonicalKey(String siteName) {
        return compactHangul(stripSiteSuffix(String.valueOf(siteName == null ? "" : siteName)));
    }

    public static String compactHangul(String value) {
        return String.valueOf(value == null ? "" : value)
                .replaceAll("\\s+", "")
                .replaceAll("[·.,\\-_/|｜:：*#]", "")
                .replaceAll("(아파트|APT|apt|오피스텔|빌라|빌딩|타워|단지)$", "")
                .trim();
    }

    private static String stripSiteSuffix(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return APT_SUFFIX.matcher(value.trim()).replaceAll("").trim();
    }

    private static String digitsOnly(String value) {
        return String.valueOf(value == null ? "" : value).replaceAll("\\D", "");
    }
}
