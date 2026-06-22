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
@Table(name = "schedule_board_mentions")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ScheduleBoardMention extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id")
    private ScheduleBoardPost post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comment_id")
    private ScheduleBoardComment comment;

    @Column(name = "mentioned_user_id", nullable = false)
    private Long mentionedUserId;

    @Column(name = "mentioned_name", nullable = false, length = 80)
    private String mentionedName;

    @Builder
    public ScheduleBoardMention(
            ScheduleBoardPost post,
            ScheduleBoardComment comment,
            Long mentionedUserId,
            String mentionedName
    ) {
        this.post = post;
        this.comment = comment;
        this.mentionedUserId = mentionedUserId;
        this.mentionedName = mentionedName != null ? mentionedName : "";
    }
}
