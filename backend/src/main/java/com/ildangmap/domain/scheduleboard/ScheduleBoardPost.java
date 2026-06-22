package com.ildangmap.domain.scheduleboard;

import com.ildangmap.global.persistence.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "schedule_board_posts")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ScheduleBoardPost extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "schedule_id", nullable = false, length = 64)
    private String scheduleId;

    @Column(name = "briefing_id", length = 64)
    private String briefingId;

    @Column(name = "author_user_id", nullable = false)
    private Long authorUserId;

    @Column(name = "author_name", nullable = false, length = 80)
    private String authorName;

    @Column(name = "author_image_url", length = 512)
    private String authorImageUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "post_type", nullable = false, length = 16)
    private ScheduleBoardPostType postType;

    @Column(nullable = false, length = 2000)
    private String body;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Builder
    public ScheduleBoardPost(
            String scheduleId,
            String briefingId,
            Long authorUserId,
            String authorName,
            String authorImageUrl,
            ScheduleBoardPostType postType,
            String body
    ) {
        this.scheduleId = scheduleId;
        this.briefingId = briefingId;
        this.authorUserId = authorUserId;
        this.authorName = authorName;
        this.authorImageUrl = authorImageUrl;
        this.postType = postType != null ? postType : ScheduleBoardPostType.notice;
        this.body = body != null ? body : "";
    }

    public void touchUpdatedAt() {
        // JPA auditing handles updatedAt on save
    }
}
