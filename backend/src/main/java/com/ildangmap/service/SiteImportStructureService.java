package com.ildangmap.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ildangmap.api.siteimport.dto.SiteImportStructureRequest;
import com.ildangmap.api.siteimport.dto.SiteImportStructureResponse;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class SiteImportStructureService {

    private static final Pattern COMPACT =
            Pattern.compile("([가-힣A-Za-z]{2,20})(?:\\1)?(\\d{3,4})동(\\d{2,4})호");
    private static final Pattern DONG_HO = Pattern.compile("(\\d{3,4})\\s*동\\s*(\\d{2,4})\\s*호");
    private static final Pattern COMMON_PW =
            Pattern.compile("(?:공비|공동(?:비번|비밀번호|번호)?|공용(?:비번|비밀번호))\\s*[:：]?\\s*([#*\\d]{3,8})", Pattern.CASE_INSENSITIVE);
    private static final Pattern HOUSE_PW =
            Pattern.compile("(?:세비|세대(?:비번|비밀번호|번호)?|현관(?:비번|비밀번호|번호)?)\\s*[:：]?\\s*([#*\\d*]{3,10})", Pattern.CASE_INSENSITIVE);

    private final ObjectMapper objectMapper;

    @Value("${app.openai-api-key:}")
    private String openAiApiKey;

    @Value("${app.openai-model:gpt-4o-mini}")
    private String openAiModel;

    public SiteImportStructureResponse structure(SiteImportStructureRequest request) {
        String text = request != null ? String.valueOf(request.getText()).trim() : "";
        SiteImportStructureResponse rule = extractByRules(text);
        if (StringUtils.hasText(openAiApiKey) && text.length() >= 4) {
            try {
                SiteImportStructureResponse gpt = extractByGpt(text, rule);
                if (gpt != null && gpt.hasUnit()) {
                    return gpt;
                }
            } catch (Exception ignored) {
                /* rule fallback */
            }
        }
        return rule;
    }

    private SiteImportStructureResponse extractByRules(String text) {
        String blob = text.replaceAll("\\s+", " ").trim();
        String compact = blob.replace(" ", "");

        Matcher m = COMPACT.matcher(compact);
        String apartmentName = "";
        String building = "";
        String unit = "";
        double confidence = 0;

        if (m.find()) {
            apartmentName = stripAptSuffix(m.group(1));
            building = digitsOnly(m.group(2));
            unit = digitsOnly(m.group(3));
            confidence = 0.88;
            if (StringUtils.hasText(apartmentName)) confidence = 0.92;
        } else {
            Matcher loose = DONG_HO.matcher(blob);
            if (loose.find()) {
                building = digitsOnly(loose.group(1));
                unit = digitsOnly(loose.group(2));
                confidence = 0.62;
                int idx = loose.start();
                if (idx > 0) {
                    String before = blob.substring(0, idx).trim();
                    Matcher apt = Pattern.compile("([가-힣A-Za-z0-9]{2,20})\\s*$").matcher(before);
                    if (apt.find()) {
                        apartmentName = stripAptSuffix(apt.group(1));
                        confidence = 0.78;
                    }
                }
            }
        }

        String commonPassword = matchGroup(COMMON_PW, blob);
        String housePassword = matchGroup(HOUSE_PW, blob);
        if (StringUtils.hasText(commonPassword) && commonPassword.equals(housePassword)) {
            housePassword = "";
        }

        List<String> workItems = new ArrayList<>();
        for (String line : text.split("\\R")) {
            String trimmed = line.trim();
            if (trimmed.matches(".*(필름|도배|타일|페인트|줄눈|시공|공사).*") && trimmed.length() <= 80) {
                workItems.add(trimmed);
            }
        }

        return SiteImportStructureResponse.builder()
                .title(buildTitle(apartmentName, building, unit))
                .apartmentName(apartmentName)
                .building(building)
                .unit(unit)
                .commonPassword(commonPassword != null ? commonPassword : "")
                .housePassword(housePassword != null ? housePassword : "")
                .workItems(workItems)
                .confidence(confidence)
                .source("rule")
                .build();
    }

    private SiteImportStructureResponse extractByGpt(String text, SiteImportStructureResponse ruleHint) throws Exception {
        String system =
                """
                OCR 텍스트에서 현장 일정 필드를 JSON으로 추출하세요.
                반드시 아래 키만 사용: title, apartmentName, building, unit, commonPassword, housePassword, workItems
                - building/unit은 숫자만 (동/호 접미사 제외)
                - title은 apartmentName building동 unit호 형식 (동/호 있을 때)
                - workItems는 문자열 배열
                - 찾지 못한 값은 빈 문자열 또는 빈 배열
                """;

        String user =
                "OCR:\n"
                        + text
                        + "\n\nruleHint:\n"
                        + objectMapper.writeValueAsString(ruleHint);

        String body =
                objectMapper.writeValueAsString(
                        java.util.Map.of(
                                "model",
                                openAiModel,
                                "response_format",
                                java.util.Map.of("type", "json_object"),
                                "messages",
                                List.of(
                                        java.util.Map.of("role", "system", "content", system),
                                        java.util.Map.of("role", "user", "content", user))));

        HttpRequest httpRequest =
                HttpRequest.newBuilder()
                        .uri(URI.create("https://api.openai.com/v1/chat/completions"))
                        .timeout(Duration.ofSeconds(25))
                        .header("Authorization", "Bearer " + openAiApiKey)
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(body))
                        .build();

        HttpClient client = HttpClient.newHttpClient();
        HttpResponse<String> response = client.send(httpRequest, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            return null;
        }

        JsonNode root = objectMapper.readTree(response.body());
        String content = root.path("choices").path(0).path("message").path("content").asText("");
        if (!StringUtils.hasText(content)) return null;

        JsonNode parsed = objectMapper.readTree(content);
        String building = digitsOnly(parsed.path("building").asText(""));
        String unit = digitsOnly(parsed.path("unit").asText(""));
        String apartmentName = parsed.path("apartmentName").asText("").trim();
        List<String> workItems = new ArrayList<>();
        if (parsed.path("workItems").isArray()) {
            parsed.path("workItems").forEach(n -> workItems.add(n.asText("").trim()));
        }

        double confidence = ruleHint.getConfidence();
        if (StringUtils.hasText(building) && StringUtils.hasText(unit)) {
            confidence = Math.max(confidence, 0.85);
        }

        return SiteImportStructureResponse.builder()
                .title(
                        StringUtils.hasText(parsed.path("title").asText(""))
                                ? parsed.path("title").asText("").trim()
                                : buildTitle(apartmentName, building, unit))
                .apartmentName(apartmentName)
                .building(building)
                .unit(unit)
                .commonPassword(parsed.path("commonPassword").asText("").trim())
                .housePassword(parsed.path("housePassword").asText("").trim())
                .workItems(workItems)
                .confidence(confidence)
                .source("gpt")
                .build();
    }

    private String buildTitle(String apartmentName, String building, String unit) {
        if (!StringUtils.hasText(building) || !StringUtils.hasText(unit)) {
            return StringUtils.hasText(apartmentName) ? apartmentName.trim() : "";
        }
        String apt = StringUtils.hasText(apartmentName) ? apartmentName.trim() + " " : "";
        return (apt + building + "동 " + unit + "호").trim();
    }

    private String stripAptSuffix(String value) {
        return String.valueOf(value).replaceAll("(아파트|APT|apt)$", "").trim();
    }

    private String digitsOnly(String value) {
        return String.valueOf(value).replaceAll("[^\\d]", "");
    }

    private String matchGroup(Pattern pattern, String text) {
        Matcher m = pattern.matcher(text);
        return m.find() ? m.group(1) : null;
    }
}
