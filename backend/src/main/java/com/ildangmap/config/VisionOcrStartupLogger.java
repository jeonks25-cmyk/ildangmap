package com.ildangmap.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Slf4j
@Component
public class VisionOcrStartupLogger implements ApplicationRunner {

    @Value("${app.gemini-api-key:}")
    private String geminiApiKey;

    @Value("${app.gemini-model:gemini-2.5-flash}")
    private String geminiModel;

    @Override
    public void run(ApplicationArguments args) {
        boolean configured = StringUtils.hasText(geminiApiKey);
        log.info(
                "[VISION-OCR] startup geminiConfigured={} model={} keyLength={}",
                configured,
                geminiModel,
                configured ? geminiApiKey.length() : 0);
        if (!configured) {
            log.warn("[VISION-OCR] startup GEMINI_API_KEY missing — vision-parse will return gemini_api_key_missing");
        }
    }
}
