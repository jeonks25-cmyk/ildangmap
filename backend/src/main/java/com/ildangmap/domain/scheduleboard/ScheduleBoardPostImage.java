package com.ildangmap.domain.scheduleboard;

import com.ildangmap.global.persistence.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "schedule_board_post_images")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ScheduleBoardPostImage extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private ScheduleBoardPost post;

    /** MVP: data URL. Phase 2B+: CDN URL */
    @Column(name = "image_data_url", columnDefinition = "LONGTEXT")
    private String imageDataUrl;

    @Column(name = "image_url", length = 2048)
    private String imageUrl;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Builder
    public ScheduleBoardPostImage(ScheduleBoardPost post, String imageDataUrl, String imageUrl, int sortOrder) {
        this.post = post;
        this.imageDataUrl = imageDataUrl;
        this.imageUrl = imageUrl;
        this.sortOrder = sortOrder;
    }
}
