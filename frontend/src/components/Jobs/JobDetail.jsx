import React from "react";
import { normalizeJobTrade } from "../../utils/jobTrade";
import {
  STATUS_LABEL,
  WORK_TYPE_LABEL,
  applicantCount,
  canApplyToJob,
  formatCraftWithEmoji,
  formatPostedRelative,
  getAddressForViewer,
  hasSelfApplied,
  isNewJobWithin30Min,
  isUrgentJob,
} from "../../utils/jobModel";

function parsePay(payText) {
  const n = Number(String(payText || "").replace(/[^0-9]/g, ""));
  return Number.isFinite(n) && n > 0 ? n.toLocaleString() : String(payText || "-");
}

function fallbackDistance(job) {
  if (job?.distanceKm != null && Number.isFinite(Number(job.distanceKm))) {
    return `${Number(job.distanceKm).toFixed(1)}km`;
  }
  const seed = Number(job?.id) || 1;
  const km = 0.8 + (seed % 7) * 0.5;
  return `${km.toFixed(1)}km`;
}

function fallbackWorkDate(job) {
  if (job?.workDate) return job.workDate;
  const seed = Number(job?.id) || 1;
  const day = 13 + (seed % 7);
  return `2026-05-${String(day).padStart(2, "0")}`;
}

function fallbackDescription(job) {
  if (job?.description) return job.description;
  const trade = job?.trade || "기술자";
  return `${trade} 중심 현장입니다. 안전장비 지참, 작업 전 간단 브리핑 후 투입됩니다.`;
}

export default function JobDetail({ job, onBack, onApply, onShowApplicants }) {
  if (!job) {
    return (
      <div className="daangn-job-detail">
        <header className="daangn-job-detail__topbar">
          <button type="button" className="daangn-job-detail__back" onClick={onBack} aria-label="뒤로가기">
            ←
          </button>
          <h1>공고 상세</h1>
          <span className="daangn-job-detail__topbar-spacer" />
        </header>
        <section className="daangn-job-detail__body">
          <article className="daangn-job-detail__card">
            <p className="daangn-job-detail__empty">공고를 찾을 수 없습니다.</p>
          </article>
        </section>
      </div>
    );
  }

  const trade = normalizeJobTrade(job);
  const st = job.status || "recruiting";
  const statusText = STATUS_LABEL[st] || st;
  const workTypeText = WORK_TYPE_LABEL[job.workType] || "종일";
  const count = applicantCount(job);
  const applied = hasSelfApplied(job);
  const canApply = canApplyToJob(job);
  const addrLine = getAddressForViewer(job);
  const now = new Date();
  const postedText = formatPostedRelative(job, now);
  const showNew = isNewJobWithin30Min(job, now);
  const urgent = isUrgentJob(job);

  return (
    <div className="daangn-job-detail">
      <header className="daangn-job-detail__topbar">
        <button type="button" className="daangn-job-detail__back" onClick={onBack} aria-label="뒤로가기">
          ←
        </button>
        <h1>공고 상세</h1>
        <span className="daangn-job-detail__topbar-spacer" />
      </header>

      <section className="daangn-job-detail__body">
        <article className="daangn-job-detail__card">
          <div className="daangn-job-detail__badge-row">
            <span className={`job-status-badge job-status-badge--${st}`}>{statusText}</span>
            {urgent ? (
              <span className="job-urgent-badge" aria-label="급구">
                🔥 급구
              </span>
            ) : null}
            {showNew ? <span className="job-new-badge">NEW</span> : null}
            <span className="job-posted-pill">{postedText}</span>
            <span className="job-worktype-badge">{workTypeText}</span>
          </div>
          <div className="daangn-job-detail__hero">
            <div className="daangn-job-detail__hero-line">{formatCraftWithEmoji(job)} · {trade}</div>
            <div className="daangn-job-detail__hero-pay">{parsePay(job.pay)}원</div>
          </div>
          <h2 className="daangn-job-detail__title">{job.title || "제목 없음"}</h2>
          <p className="daangn-job-detail__addr-line">{addrLine}</p>

          <div className="daangn-job-detail__meta-list">
            <div className="daangn-job-detail__meta-row">
              <span>급여</span>
              <strong>{parsePay(job.pay)}원</strong>
            </div>
            <div className="daangn-job-detail__meta-row">
              <span>거리</span>
              <strong>{fallbackDistance(job)}</strong>
            </div>
            <div className="daangn-job-detail__meta-row">
              <span>작업 날짜</span>
              <strong>{fallbackWorkDate(job)}</strong>
            </div>
            <div className="daangn-job-detail__meta-row">
              <span>모집 직군</span>
              <strong>{trade}</strong>
            </div>
            <div className="daangn-job-detail__meta-row">
              <span>지원자</span>
              <strong>👥 지원자 {count}명</strong>
            </div>
          </div>

          <div className="daangn-job-detail__desc-wrap">
            <h3>작업 설명</h3>
            <p>{fallbackDescription(job)}</p>
          </div>
        </article>
      </section>

      <footer className="daangn-job-detail__bottom daangn-job-detail__bottom--split">
        <button type="button" className="daangn-job-detail__secondary" onClick={() => onShowApplicants?.()}>
          지원자 보기
        </button>
        <button
          type="button"
          className="daangn-job-detail__apply"
          disabled={!canApply}
          onClick={() => canApply && onApply?.(job)}
        >
          {applied ? "지원완료" : "지원하기"}
        </button>
      </footer>
    </div>
  );
}
