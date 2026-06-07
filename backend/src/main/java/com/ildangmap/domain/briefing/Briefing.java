package com.ildangmap.domain.briefing;

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
        name = "briefings",
        indexes = {
                @Index(name = "idx_briefings_craft", columnList = "craft"),
                @Index(name = "idx_briefings_region", columnList = "region"),
                @Index(name = "idx_briefings_active_published", columnList = "active, published_at")
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Briefing extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BriefingCategory category;

    @Column(nullable = false, length = 40)
    private String craft;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, length = 500)
    private String summary;

    @Column(nullable = false, length = 100)
    private String region;

    @Column(name = "average_pay", length = 80)
    private String averagePay;

    @Column(length = 150)
    private String trend;

    @Column(length = 1000)
    private String flow;

    @Column(name = "published_at", nullable = false)
    private LocalDateTime publishedAt;

    @Column(nullable = false)
    private boolean active;

    @Builder
    public Briefing(
            BriefingCategory category,
            String craft,
            String title,
            String summary,
            String region,
            String averagePay,
            String trend,
            String flow,
            LocalDateTime publishedAt,
            boolean active
    ) {
        this.category = category;
        this.craft = craft;
        this.title = title;
        this.summary = summary;
        this.region = region;
        this.averagePay = averagePay;
        this.trend = trend;
        this.flow = flow;
        this.publishedAt = publishedAt;
        this.active = active;
    }
}
