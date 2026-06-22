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

import java.time.LocalDateTime;

@Getter
@Entity
@Table(
        name = "site_dictionary_entry",
        indexes = {
                @Index(name = "uk_site_dictionary_canonical_key", columnList = "canonical_key", unique = true),
                @Index(name = "idx_site_dictionary_entry_type", columnList = "entry_type"),
                @Index(name = "idx_site_dictionary_region", columnList = "region"),
                @Index(name = "idx_site_dictionary_registration_count", columnList = "registration_count")
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SiteDictionaryEntry extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "canonical_key", nullable = false, length = 120, unique = true)
    private String canonicalKey;

    @Column(name = "display_name", nullable = false, length = 120)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(name = "entry_type", nullable = false, length = 20)
    private SiteDictionaryEntryType entryType;

    @Column(length = 40)
    private String region;

    @Column(name = "registration_count", nullable = false)
    private long registrationCount;

    /** buildings, crafts, aliases — JSON object */
    @Column(name = "meta_json", columnDefinition = "TEXT")
    private String metaJson;

    @Column(name = "last_seen_at", nullable = false)
    private LocalDateTime lastSeenAt;

    @Builder
    public SiteDictionaryEntry(
            String canonicalKey,
            String displayName,
            SiteDictionaryEntryType entryType,
            String region,
            long registrationCount,
            String metaJson,
            LocalDateTime lastSeenAt
    ) {
        this.canonicalKey = canonicalKey;
        this.displayName = displayName;
        this.entryType = entryType != null ? entryType : SiteDictionaryEntryType.SITE;
        this.region = region;
        this.registrationCount = Math.max(0, registrationCount);
        this.metaJson = metaJson != null ? metaJson : "{}";
        this.lastSeenAt = lastSeenAt != null ? lastSeenAt : LocalDateTime.now();
    }

    public void recordVisit(String displayName, String region, String building, String craft, long increment) {
        if (displayName != null && !displayName.isBlank()) {
            this.displayName = displayName.trim();
        }
        if (region != null && !region.isBlank()) {
            this.region = region.trim();
        }
        this.registrationCount = Math.max(0, this.registrationCount) + Math.max(1, increment);
        this.lastSeenAt = LocalDateTime.now();
    }

    public void replaceFromBackfill(String displayName, String region, long count, String metaJson) {
        if (displayName != null && !displayName.isBlank()) {
            this.displayName = displayName.trim();
        }
        if (region != null && !region.isBlank()) {
            this.region = region.trim();
        }
        this.registrationCount = Math.max(0, count);
        if (metaJson != null && !metaJson.isBlank()) {
            this.metaJson = metaJson;
        }
        this.lastSeenAt = LocalDateTime.now();
    }

    public void updateMetaJson(String metaJson) {
        if (metaJson != null && !metaJson.isBlank()) {
            this.metaJson = metaJson;
        }
    }
}
