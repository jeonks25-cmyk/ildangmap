package com.ildangmap;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(
        scanBasePackages = {
                "com.ildangmap.api",
                "com.ildangmap.service",
                "com.ildangmap.config",
                "com.ildangmap.global"
        }
)
@EnableJpaRepositories(basePackages = "com.ildangmap.repository")
public class IldangmapBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(IldangmapBackendApplication.class, args);
    }
}
