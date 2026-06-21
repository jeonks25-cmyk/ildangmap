package com.ildangmap.service.storage;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

/**
 * 피드백 첨부 저장 추상화 — 로컬 Volume / 향후 S3·Cloudinary 교체용.
 */
public interface FeedbackStorageService {

    StoredFile store(MultipartFile file);

    Resource loadAsResource(String storagePath);

    void delete(String storagePath);
}
