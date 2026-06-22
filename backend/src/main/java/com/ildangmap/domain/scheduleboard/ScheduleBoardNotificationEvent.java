package com.ildangmap.domain.scheduleboard;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "schedule_board_notification_events")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ScheduleBoardNotificationEvent {

    public enum EventType {
        notice,
        comment,
        mention
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recipient_user_id", nullable = false)
    private Long recipientUserId;

    @Column(name = "event_type", nullable = false, length = 16)
    private String eventType;

    @Column(name = "schedule_id", nullable = false, length = 64)
    private String scheduleId;

    @Column(name = "briefing_id", length = 64)
    private String briefingId;

    @Column(name = "post_id", nullable = false)
    private Long postId;

    @Column(name = "comment_id")
    private Long commentId;

    @Column(name = "actor_user_id", nullable = false)
    private Long actorUserId;

    @Column(name = "actor_name", nullable = false, length = 80)
    private String actorName;

    @Column(length = 500)
    private String preview;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @Builder
    public ScheduleBoardNotificationEvent(
            Long recipientUserId,
            EventType eventType,
            String scheduleId,
            String briefingId,
            Long postId,
            Long commentId,
            Long actorUserId,
            String actorName,
            String preview,
            LocalDateTime createdAt
    ) {
        this.recipientUserId = recipientUserId;
        this.eventType = eventType != null ? eventType.name() : EventType.notice.name();
        this.scheduleId = scheduleId;
        this.briefingId = briefingId;
        this.postId = postId;
        this.commentId = commentId;
        this.actorUserId = actorUserId;
        this.actorName = actorName != null ? actorName : "";
        this.preview = preview;
        this.createdAt = createdAt != null ? createdAt : LocalDateTime.now();
    }

    public void markDelivered() {
        this.deliveredAt = LocalDateTime.now();
    }
}
