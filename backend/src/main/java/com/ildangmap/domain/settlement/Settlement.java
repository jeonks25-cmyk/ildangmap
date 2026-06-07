package com.ildangmap.domain.settlement;

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

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Entity
@Table(
        name = "settlements",
        indexes = {
                @Index(name = "idx_settlements_job", columnList = "job_id"),
                @Index(name = "idx_settlements_user_month", columnList = "user_id, settlement_month"),
                @Index(name = "idx_settlements_status", columnList = "status")
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Settlement extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_id", nullable = false)
    private Long jobId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "settlement_month", nullable = false, length = 7)
    private String settlementMonth;

    @Column(name = "expected_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal expectedAmount;

    @Column(name = "settled_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal settledAmount;

    @Column(name = "unpaid_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal unpaidAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SettlementStatus status;

    @Column(name = "settled_date")
    private LocalDate settledDate;

    @Column(length = 300)
    private String memo;

    @Builder
    public Settlement(
            Long jobId,
            Long userId,
            String settlementMonth,
            BigDecimal expectedAmount,
            BigDecimal settledAmount,
            BigDecimal unpaidAmount,
            SettlementStatus status,
            LocalDate settledDate,
            String memo
    ) {
        this.jobId = jobId;
        this.userId = userId;
        this.settlementMonth = settlementMonth;
        this.expectedAmount = expectedAmount;
        this.settledAmount = settledAmount;
        this.unpaidAmount = unpaidAmount;
        this.status = status;
        this.settledDate = settledDate;
        this.memo = memo;
    }
}
