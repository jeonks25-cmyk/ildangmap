package com.ildangmap.domain.feedback;

import com.ildangmap.domain.user.UserType;
import com.ildangmap.global.persistence.BaseTimeEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Getter
@Entity
@Table(
        name = "beta_feedback",
        indexes = {
                @Index(name = "idx_beta_feedback_created", columnList = "created_at"),
                @Index(name = "idx_beta_feedback_status_created", columnList = "status, created_at"),
                @Index(name = "idx_beta_feedback_severity_created", columnList = "severity, created_at"),
                @Index(name = "idx_beta_feedback_similarity_group", columnList = "similarity_group_key")
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BetaFeedback extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "display_nickname", length = 16)
    private String displayNickname;

    @Enumerated(EnumType.STRING)
    @Column(name = "user_type", nullable = false, length = 20)
    private UserType userType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private BetaFeedbackCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BetaFeedbackSeverity severity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BetaFeedbackStatus status;

    @Column(columnDefinition = "TEXT")
    private String inconvenient;

    @Column(name = "feature_request", columnDefinition = "TEXT")
    private String featureRequest;

    @Column(name = "other_comment", columnDefinition = "TEXT")
    private String otherComment;

    @Column(name = "similarity_group_key", nullable = false, length = 80)
    private String similarityGroupKey;

    @OneToMany(mappedBy = "feedback", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<BetaFeedbackAttachment> attachments = new ArrayList<>();

    @Builder
    public BetaFeedback(
            Long userId,
            String displayNickname,
            UserType userType,
            BetaFeedbackCategory category,
            BetaFeedbackSeverity severity,
            String inconvenient,
            String featureRequest,
            String otherComment,
            String similarityGroupKey
    ) {
        this.userId = userId;
        this.displayNickname = displayNickname;
        this.userType = userType;
        this.category = category;
        this.severity = severity;
        this.status = BetaFeedbackStatus.NEW;
        this.inconvenient = inconvenient;
        this.featureRequest = featureRequest;
        this.otherComment = otherComment;
        this.similarityGroupKey = similarityGroupKey;
    }

    public void changeStatus(BetaFeedbackStatus next) {
        this.status = next;
    }

    public void addAttachment(BetaFeedbackAttachment attachment) {
        attachments.add(attachment);
        attachment.bindFeedback(this);
    }
}
