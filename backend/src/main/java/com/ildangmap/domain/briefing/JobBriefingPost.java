package com.ildangmap.domain.briefing;

import com.ildangmap.global.persistence.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "job_briefing_posts")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JobBriefingPost extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private JobBriefingRoom room;

    @Column(name = "author_user_id", nullable = false)
    private Long authorUserId;

    @Column(name = "author_name", nullable = false, length = 80)
    private String authorName;

    @Column(nullable = false, length = 2000)
    private String body;

    @Enumerated(EnumType.STRING)
    @Column(name = "post_type", nullable = false, length = 24)
    private BriefingPostType postType;

    /** data URL (image/jpeg|png|webp) — MVP 단일 썸네일, 용량은 서비스에서 검증 */
    @Column(name = "image_data_url", columnDefinition = "LONGTEXT")
    private String imageDataUrl;

    @Builder
    public JobBriefingPost(
            JobBriefingRoom room,
            Long authorUserId,
            String authorName,
            String body,
            BriefingPostType postType,
            String imageDataUrl
    ) {
        this.room = room;
        this.authorUserId = authorUserId;
        this.authorName = authorName;
        this.body = body;
        this.postType = postType != null ? postType : BriefingPostType.GENERAL;
        this.imageDataUrl = imageDataUrl;
    }
}
