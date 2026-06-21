package com.ildangmap.domain.feedback;

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
@Table(name = "beta_feedback_attachment")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BetaFeedbackAttachment extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "feedback_id", nullable = false)
    private BetaFeedback feedback;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "file_size", nullable = false)
    private long fileSize;

    /** 스토리지 상대 경로 (예: feedback/2026/06/uuid.jpg) */
    @Column(name = "storage_path", nullable = false, length = 500)
    private String storagePath;

    @Builder
    public BetaFeedbackAttachment(String fileName, String contentType, long fileSize, String storagePath) {
        this.fileName = fileName;
        this.contentType = contentType;
        this.fileSize = fileSize;
        this.storagePath = storagePath;
    }

    void bindFeedback(BetaFeedback feedback) {
        this.feedback = feedback;
    }
}
