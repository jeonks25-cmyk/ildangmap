package com.ildangmap.domain.scheduleboard;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
        name = "schedule_board_post_reads",
        uniqueConstraints = @UniqueConstraint(name = "uk_sbpr_user_post", columnNames = {"user_id", "post_id"}))
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ScheduleBoardPostRead {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private ScheduleBoardPost post;

    @Column(name = "read_at", nullable = false)
    private LocalDateTime readAt;

    @Builder
    public ScheduleBoardPostRead(Long userId, ScheduleBoardPost post, LocalDateTime readAt) {
        this.userId = userId;
        this.post = post;
        this.readAt = readAt != null ? readAt : LocalDateTime.now();
    }
}
