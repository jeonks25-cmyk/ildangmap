package com.ildangmap.service.storage;

import com.ildangmap.global.exception.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@ConditionalOnProperty(name = "app.feedback.storage.type", havingValue = "local", matchIfMissing = true)
public class LocalFeedbackStorageService implements FeedbackStorageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "image/heic",
            "image/heif"
    );

    private final Path baseDir;

    public LocalFeedbackStorageService(
            @Value("${app.feedback.storage.local.base-dir:uploads/feedback}") String baseDir
    ) {
        this.baseDir = Paths.get(baseDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.baseDir);
            log.info("[feedback-storage] local baseDir={}", this.baseDir);
        } catch (IOException e) {
            throw new IllegalStateException("피드백 업로드 디렉터리를 생성하지 못했습니다: " + this.baseDir, e);
        }
    }

    @Override
    public StoredFile store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("빈 파일은 업로드할 수 없습니다.");
        }
        String contentType = String.valueOf(file.getContentType() != null ? file.getContentType() : "").toLowerCase();
        if (!contentType.startsWith("image/")) {
            throw new BadRequestException("이미지 파일만 업로드할 수 있습니다.");
        }
        if (!ALLOWED_CONTENT_TYPES.contains(contentType) && !contentType.startsWith("image/")) {
            throw new BadRequestException("지원하지 않는 이미지 형식입니다.");
        }

        String ext = resolveExtension(file.getOriginalFilename(), contentType);
        LocalDate today = LocalDate.now();
        String relative = String.format("feedback/%d/%02d/%s%s",
                today.getYear(), today.getMonthValue(), UUID.randomUUID(), ext);
        Path target = baseDir.resolve(relative).normalize();
        if (!target.startsWith(baseDir)) {
            throw new BadRequestException("잘못된 저장 경로입니다.");
        }
        try {
            Files.createDirectories(target.getParent());
            file.transferTo(target);
        } catch (IOException e) {
            throw new BadRequestException("파일 저장에 실패했습니다.");
        }
        return new StoredFile(relative, sanitizeFileName(file.getOriginalFilename()), contentType, file.getSize());
    }

    @Override
    public Resource loadAsResource(String storagePath) {
        Path path = resolveSafePath(storagePath);
        if (!Files.exists(path)) {
            throw new BadRequestException("첨부 파일을 찾을 수 없습니다.");
        }
        return new FileSystemResource(path);
    }

    @Override
    public void delete(String storagePath) {
        try {
            Files.deleteIfExists(resolveSafePath(storagePath));
        } catch (IOException e) {
            log.warn("[feedback-storage] delete failed path={}", storagePath, e);
        }
    }

    private Path resolveSafePath(String storagePath) {
        if (!StringUtils.hasText(storagePath) || storagePath.contains("..")) {
            throw new BadRequestException("잘못된 파일 경로입니다.");
        }
        Path path = baseDir.resolve(storagePath).normalize();
        if (!path.startsWith(baseDir)) {
            throw new BadRequestException("잘못된 파일 경로입니다.");
        }
        return path;
    }

    private static String resolveExtension(String originalName, String contentType) {
        String ext = "";
        if (StringUtils.hasText(originalName) && originalName.contains(".")) {
            ext = originalName.substring(originalName.lastIndexOf('.')).toLowerCase();
        }
        if (!ext.matches("\\.(jpe?g|png|webp|heic|heif)")) {
            ext = switch (contentType) {
                case "image/png" -> ".png";
                case "image/webp" -> ".webp";
                case "image/heic", "image/heif" -> ".heic";
                default -> ".jpg";
            };
        }
        return ext;
    }

    private static String sanitizeFileName(String name) {
        String base = StringUtils.hasText(name) ? Paths.get(name).getFileName().toString() : "image";
        return base.replaceAll("[^a-zA-Z0-9가-힣._-]", "_").substring(0, Math.min(base.length(), 200));
    }
}
