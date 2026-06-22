package com.ildangmap.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ildangmap.api.siteimport.dto.SiteImportStructureResponse;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class SiteImportVisionParseService {

    private static final String PROMPT =
            """
            당신은 현장 일정 정보를 추출하는 AI입니다.

            입력은 카카오톡 대화 캡처 이미지입니다.

            목표:
            현장명, 동, 호, 공동비밀번호, 세대비밀번호, 작업내용을 추출합니다.

            규칙:
            1. 발신자명, 시간, 상태바, 배터리, 통신사, 검색버튼, 계좌번호, 잡담, 이모지는 무시합니다.
            2. 현장정보가 있는 말풍선만 분석합니다.
            3. JSON만 반환합니다.
            4. 정보가 없으면 null 또는 빈 문자열을 사용합니다.
            5. title은 "현장명 동 호" 형태로 생성합니다. 예: 장재계룡 1109동 1402호
            6. building, unit은 숫자만 (동/호 접미사 제외)

            반드시 아래 키만 사용하는 JSON 객체 하나만 반환하세요:
            title, apartmentName, building, unit, commonPassword, housePassword, workItems, confidence
            workItems는 문자열 배열입니다.
            """;

    private final ObjectMapper objectMapper;

    @Value("${app.gemini-api-key:}")
    private String geminiApiKey;

    @Value("${app.gemini-model:gemini-2.5-flash}")
    private String geminiModel;

    public SiteImportStructureResponse parse(MultipartFile image) throws Exception {
        if (image == null || image.isEmpty()) {
            throw new IllegalArgumentException("image_required");
        }
        if (!StringUtils.hasText(geminiApiKey)) {
            log.warn("[VISION-OCR] blocked reason=gemini_api_key_missing");
            throw new IllegalStateException("gemini_api_key_missing");
        }

        String mimeType = StringUtils.hasText(image.getContentType()) ? image.getContentType() : "image/jpeg";
        if (!mimeType.startsWith("image/")) {
            mimeType = "image/jpeg";
        }

        byte[] bytes = image.getBytes();
        if (bytes.length > 2 * 1024 * 1024) {
            throw new IllegalArgumentException("image_too_large");
        }

        String base64 = Base64.getEncoder().encodeToString(bytes);
        log.info("[VISION-OCR] request fileName={} size={} mime={}", image.getOriginalFilename(), bytes.length, mimeType);

        String requestBody =
                objectMapper.writeValueAsString(
                        Map.of(
                                "contents",
                                List.of(
                                        Map.of(
                                                "parts",
                                                List.of(
                                                        Map.of("text", PROMPT),
                                                        Map.of(
                                                                "inline_data",
                                                                Map.of("mime_type", mimeType, "data", base64))))),
                                "generationConfig",
                                Map.of("responseMimeType", "application/json", "temperature", 0.1)));

        String url =
                "https://generativelanguage.googleapis.com/v1beta/models/"
                        + geminiModel
                        + ":generateContent?key="
                        + geminiApiKey;

        HttpRequest httpRequest =
                HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .timeout(Duration.ofSeconds(45))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                        .build();

        HttpClient client = HttpClient.newHttpClient();
        HttpResponse<String> response = client.send(httpRequest, HttpResponse.BodyHandlers.ofString());
        log.info("[VISION-OCR] response status={}", response.statusCode());
        if (response.statusCode() >= 400) {
            log.warn("[VISION-OCR] response body={}", truncate(response.body(), 500));
            throw new IllegalStateException("gemini_request_failed");
        }

        JsonNode root = objectMapper.readTree(response.body());
        String content =
                root.path("candidates")
                        .path(0)
                        .path("content")
                        .path("parts")
                        .path(0)
                        .path("text")
                        .asText("");
        if (!StringUtils.hasText(content)) {
            throw new IllegalStateException("gemini_empty_response");
        }

        JsonNode parsed = objectMapper.readTree(content);
        log.info("[VISION-OCR] parsed-json {}", truncate(parsed.toString(), 800));

        String building = digitsOnly(parsed.path("building").asText(""));
        String unit = digitsOnly(parsed.path("unit").asText(""));
        String apartmentName = nullSafe(parsed.path("apartmentName").asText(""));
        List<String> workItems = new ArrayList<>();
        if (parsed.path("workItems").isArray()) {
            parsed.path("workItems").forEach(n -> {
                String item = nullSafe(n.asText(""));
                if (StringUtils.hasText(item)) workItems.add(item);
            });
        }

        String title =
                StringUtils.hasText(parsed.path("title").asText(""))
                        ? nullSafe(parsed.path("title").asText(""))
                        : buildTitle(apartmentName, building, unit);

        double confidence = parsed.path("confidence").asDouble(0.85);
        if (!StringUtils.hasText(building) || !StringUtils.hasText(unit)) {
            confidence = Math.min(confidence, 0.55);
        }

        return SiteImportStructureResponse.builder()
                .title(title)
                .apartmentName(apartmentName)
                .building(building)
                .unit(unit)
                .commonPassword(nullSafe(parsed.path("commonPassword").asText("")))
                .housePassword(nullSafe(parsed.path("housePassword").asText("")))
                .workItems(workItems)
                .confidence(confidence)
                .source("gemini-vision")
                .rawGeminiJson(content.trim())
                .build();
    }

    private String buildTitle(String apartmentName, String building, String unit) {
        if (!StringUtils.hasText(building) || !StringUtils.hasText(unit)) {
            return StringUtils.hasText(apartmentName) ? apartmentName.trim() : "";
        }
        String apt = StringUtils.hasText(apartmentName) ? apartmentName.trim() + " " : "";
        return (apt + building + "동 " + unit + "호").trim();
    }

    private String digitsOnly(String value) {
        return String.valueOf(value).replaceAll("[^\\d]", "");
    }

    private String nullSafe(String value) {
        return value == null ? "" : value.trim();
    }

    private String truncate(String value, int max) {
        if (value == null) return "";
        return value.length() <= max ? value : value.substring(0, max) + "...";
    }
}
