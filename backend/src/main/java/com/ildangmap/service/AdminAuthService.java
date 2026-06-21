package com.ildangmap.service;

import com.ildangmap.global.exception.ForbiddenException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AdminAuthService {

    private final Set<Long> adminUserIds;

    public AdminAuthService(@Value("${app.admin-user-ids:}") String adminUserIdsRaw) {
        this.adminUserIds = Arrays.stream(String.valueOf(adminUserIdsRaw).split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(Long::valueOf)
                .collect(Collectors.toSet());
    }

    public boolean isAdmin(Long userId) {
        return userId != null && adminUserIds.contains(userId);
    }

    public void requireAdmin(Long userId) {
        if (!isAdmin(userId)) {
            throw new ForbiddenException("관리자만 접근할 수 있습니다.");
        }
    }
}
