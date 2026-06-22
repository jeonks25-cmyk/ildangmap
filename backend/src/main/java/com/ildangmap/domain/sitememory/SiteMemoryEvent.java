package com.ildangmap.domain.sitememory;

import com.ildangmap.global.persistence.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
        name = "site_memory_event",
        indexes = {
                @Index(name = "idx_site_memory_event_user_id", columnList = "user_id"),
                @Index(name = "idx_site_memory_event_type", columnList = "event_type"),
                @Index(name = "idx_site_memory_event_canonical_key", columnList = "canonical_key"),
                @Index(name = "idx_site_memory_event_created_at", columnList = "created_at")
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SiteMemoryEvent extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 24)
    private SiteMemoryEventType eventType;

    @Column(name = "canonical_key", length = 120)
    private String canonicalKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "match_source", length = 20)
    private SiteMemoryMatchSource matchSource;

    @Column(length = 40)
    private String region;

    @Column(length = 30)
    private String craft;

    @Column(length = 8)
    private String building;

    @Column(length = 8)
    private String unit;

    @Column(nullable = false)
    private boolean success;

    @Column(name = "user_edited", nullable = false)
    private boolean userEdited;

    /** OCR 원문 해시 — 원문 미저장 */
    @Column(name = "payload_hash", length = 64)
    private String payloadHash;

    @Builder
    public SiteMemoryEvent(
            Long userId,
            SiteMemoryEventType eventType,
            String canonicalKey,
            SiteMemoryMatchSource matchSource,
            String region,
            String craft,
            String building,
            String unit,
            boolean success,
            boolean userEdited,
            String payloadHash
    ) {
        this.userId = userId;
        this.eventType = eventType;
        this.canonicalKey = canonicalKey;
        this.matchSource = matchSource;
        this.region = region;
        this.craft = craft;
        this.building = building;
        this.unit = unit;
        this.success = success;
        this.userEdited = userEdited;
        this.payloadHash = payloadHash;
    }
}
