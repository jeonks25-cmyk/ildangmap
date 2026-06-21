# 일당맵 Spring Boot — Railway / Docker 배포
FROM gradle:8.10.2-jdk17-alpine AS build
WORKDIR /app
COPY build.gradle settings.gradle ./
COPY gradle gradle
COPY src src
RUN gradle bootJar -x test --no-daemon

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN addgroup -S spring && adduser -S spring -G spring \
    && mkdir -p /tmp/ildangmap/uploads/feedback \
    && chown -R spring:spring /tmp/ildangmap
USER spring:spring
COPY --from=build /app/build/libs/*.jar app.jar
ENV PORT=8080
ENV APP_FEEDBACK_STORAGE_DIR=/tmp/ildangmap/uploads/feedback
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
