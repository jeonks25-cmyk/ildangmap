package com.ildangmap.service.storage;

public record StoredFile(
        String storagePath,
        String originalFileName,
        String contentType,
        long size
) {
}
