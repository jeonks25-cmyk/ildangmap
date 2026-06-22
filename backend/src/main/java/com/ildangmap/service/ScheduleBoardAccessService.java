package com.ildangmap.service;

import com.ildangmap.api.user.dto.SchedulesPayloadDto;
import com.ildangmap.global.exception.ForbiddenException;
import com.ildangmap.global.exception.ResourceNotFoundException;
import java.util.List;
import java.util.Map;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ScheduleBoardAccessService {

    public enum Role {
        OWNER,
        ACCEPTED,
        PENDING,
        NONE
    }

    @Getter
    public static class Access {
        private final Role role;
        private final Map<String, Object> schedule;
        private final Long viewerUserId;

        Access(Role role, Map<String, Object> schedule, Long viewerUserId) {
            this.role = role;
            this.schedule = schedule;
            this.viewerUserId = viewerUserId;
        }

        public boolean canRead() {
            return role == Role.OWNER || role == Role.ACCEPTED || role == Role.PENDING;
        }

        public boolean canWrite() {
            return role == Role.OWNER || role == Role.ACCEPTED;
        }

        public boolean isOwner() {
            return role == Role.OWNER;
        }
    }

    private final UserSchedulesService userSchedulesService;

    public Access requireRead(Long userId, String scheduleId) {
        Access access = resolve(userId, scheduleId);
        if (!access.canRead()) {
            if (access.getSchedule() == null) {
                throw new ResourceNotFoundException("일정을 찾을 수 없습니다.");
            }
            throw new ForbiddenException("이 일정에 접근 권한이 없습니다.");
        }
        return access;
    }

    public Access requireWrite(Long userId, String scheduleId) {
        Access access = resolve(userId, scheduleId);
        if (access.getSchedule() == null) {
            throw new ResourceNotFoundException("일정을 찾을 수 없습니다.");
        }
        if (access.getRole() == Role.PENDING) {
            throw new ForbiddenException("초대 수락 후 글을 작성할 수 있습니다.");
        }
        if (!access.canWrite()) {
            throw new ForbiddenException("이 일정에 접근 권한이 없습니다.");
        }
        return access;
    }

    public Access resolve(Long userId, String scheduleId) {
        String sid = normalizeScheduleId(scheduleId);
        SchedulesPayloadDto payload = userSchedulesService.getSchedules(userId);
        Map<String, Object> schedule = findSchedule(payload, sid);
        if (schedule == null) {
            return new Access(Role.NONE, null, userId);
        }
        Role role = resolveRole(schedule, userId);
        return new Access(role, schedule, userId);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> findSchedule(SchedulesPayloadDto payload, String scheduleId) {
        if (payload == null || payload.getSchedules() == null) {
            return null;
        }
        for (Map<String, Object> row : payload.getSchedules()) {
            if (row == null) continue;
            Object id = row.get("id");
            if (id != null && scheduleId.equals(String.valueOf(id).trim())) {
                return row;
            }
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private Role resolveRole(Map<String, Object> schedule, Long viewerUserId) {
        long viewer = viewerUserId != null ? viewerUserId : 0L;
        long ownerId = toLong(schedule.get("createdByUserId"));
        if (ownerId <= 0) {
            return Role.OWNER;
        }
        if (ownerId == viewer) {
            return Role.OWNER;
        }
        long accepted = toLong(schedule.get("acceptedParticipantUserId"));
        if (accepted > 0 && accepted == viewer) {
            return Role.ACCEPTED;
        }
        Object invitesRaw = schedule.get("scheduleInvites");
        if (invitesRaw instanceof List<?> invites) {
            boolean sawPending = false;
            for (Object item : invites) {
                if (!(item instanceof Map<?, ?> inv)) continue;
                long uid = toLong(inv.get("userId"));
                if (uid != viewer) continue;
                String st = String.valueOf(inv.get("status")).toLowerCase();
                if ("accepted".equals(st) || "confirmed".equals(st)) {
                    return Role.ACCEPTED;
                }
                if ("pending".equals(st)) {
                    sawPending = true;
                }
            }
            if (sawPending) {
                return Role.PENDING;
            }
        }
        return Role.NONE;
    }

    private long toLong(Object value) {
        if (value == null) return 0L;
        if (value instanceof Number n) return n.longValue();
        try {
            return Long.parseLong(String.valueOf(value).trim());
        } catch (NumberFormatException e) {
            return 0L;
        }
    }

    public String normalizeScheduleId(String scheduleId) {
        String sid = scheduleId != null ? scheduleId.trim() : "";
        if (sid.isEmpty()) {
            throw new ResourceNotFoundException("일정을 찾을 수 없습니다.");
        }
        return sid;
    }

    public String briefingIdFromSchedule(Map<String, Object> schedule) {
        if (schedule == null) return null;
        Object bid = schedule.get("briefingId");
        return bid != null ? String.valueOf(bid).trim() : null;
    }
}
