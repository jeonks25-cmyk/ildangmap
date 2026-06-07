package com.ildangmap.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI ildangmapOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Ildangmap Backend API")
                        .version("v1")
                        .description("일당맵 Spring Boot 백엔드 기본 API 문서"))
                .components(new Components().addSecuritySchemes(
                        "sessionAuth",
                        new SecurityScheme()
                                .type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.COOKIE)
                                .name("ILDANGMAPSESSION")
                ));
    }
}
