package com.ildangmap.domain.scheduleboard;

public enum ScheduleBoardPostType {
    notice,
    question,
    worklog,
    photo;

    public static ScheduleBoardPostType fromWire(String raw) {
        if (raw == null || raw.isBlank()) {
            return notice;
        }
        String s = raw.trim().toLowerCase();
        if ("general".equals(s) || "announcement".equals(s) || "공지".equals(s)) {
            return notice;
        }
        if ("help_request".equals(s) || "help".equals(s)) {
            return question;
        }
        if ("work_log".equals(s) || "작업내용".equals(s) || "작업일지".equals(s)) {
            return worklog;
        }
        if ("work_photo".equals(s) || "작업사진".equals(s)) {
            return photo;
        }
        try {
            return ScheduleBoardPostType.valueOf(s);
        } catch (IllegalArgumentException e) {
            return notice;
        }
    }
}
