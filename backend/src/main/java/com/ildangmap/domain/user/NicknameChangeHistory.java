package com.ildangmap.domain.user;

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

import java.time.LocalDateTime;

@Getter
@Entity
@Table(name = "nickname_change_history")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NicknameChangeHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "from_nickname", length = 16)
    private String fromNickname;

    @Column(name = "to_nickname", nullable = false, length = 16)
    private String toNickname;

    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt;

    @Builder
    public NicknameChangeHistory(User user, String fromNickname, String toNickname, LocalDateTime changedAt) {
        this.user = user;
        this.fromNickname = fromNickname;
        this.toNickname = toNickname;
        this.changedAt = changedAt;
    }
}
