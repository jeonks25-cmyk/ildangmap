package com.ildangmap.domain.job;

/**
 * 공고 현장 생애주기. 모집(recruiting/full) → 확정(confirmed) → 작업(working) → 완료(completed) / 취소(cancelled).
 */
public enum JobStatus {
    RECRUITING,
    FULL,
    CONFIRMED,
    WORKING,
    COMPLETED,
    CANCELLED
}
