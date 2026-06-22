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
@Table(name = "schedule_board_comments")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ScheduleBoardComment extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private ScheduleBoardPost post;

    @Column(name = "author_user_id", nullable = false)
    private Long authorUserId;

    @Column(name = "author_name", nullable = false, length = 80)
    private String authorName;

    @Column(nullable = false, length = 500)
    private String body;

    @Builder
    public ScheduleBoardComment(ScheduleBoardPost post, Long authorUserId, String authorName, String body) {
        this.post = post;
        this.authorUserId = authorUserId;
        this.authorName = authorName;
        this.body = body != null ? body : "";
    }
}
