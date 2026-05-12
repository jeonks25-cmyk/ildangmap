import React from "react";
import { normalizeJobTrade, resolveSiteType } from "../../utils/jobTrade";
import {
  STATUS_LABEL,
  WORK_TYPE_LABEL,
  applicantCount,
  canApplyToJob,
  formatCraftWithEmoji,
  formatPostedRelative,
  getAddressForViewer,
  getPublicRegionLine,
  hasSelfApplied,
  isNewJobWithin30Min,
  isUrgentJob,
} from "../../utils/jobModel";

function formatPayDisplay(pay) {
  if (pay == null || pay === "") return "-";
  const s = String(pay);
  if (s.includes("원")) return s;
  const n = Number(String(pay).replace(/[^0-9]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return s;
  return `${n.toLocaleString()}원`;
}

function siteLabel(site) {
  const a = site?.accent;
  if (a === "apartment") return "아파트";
  if (a === "public") return "관공서";
  if (a === "school") return "학교";
  if (a === "factory") return "공장";
  return "상가";
}

function formatJobDate(job) {
  const raw = job?.workDate || job?.date || job?.jobDate || "";
  if (!raw) return "미정 / 협의";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function formatWorkTime(job) {
  if (job?.workTime) return String(job.workTime);
  if (job?.startTime && job?.endTime) return `${job.startTime} ~ ${job.endTime}`;
  return "08:00 ~ 17:00";
}

function formatDistanceKm(job, index) {
  if (job?.distanceKm != null && Number.isFinite(Number(job.distanceKm))) {
    const n = Number(job.distanceKm);
    if (n < 1) return `${Math.round(n * 1000)}m`;
    return `${n.toFixed(1)}km`;
  }
  const base = 0.55 + (index % 6) * 0.28;
  return `${base.toFixed(1)}km`;
}

export default function JobDetailModal({
  job,
  open,
  onClose,
  onApply,
  onShowApplicants,
  listIndex = 0,
  listTime = Date.now(),
}) {
  if (!open || !job) return null;

  const now = new Date(listTime);
  const trade = normalizeJobTrade(job);
  const site = resolveSiteType(job);
  const dist = formatDistanceKm(job, listIndex);
  const slots = job?.slotsNeeded ?? job?.recruitCount ?? job?.모집인원;
  const slotsText = slots != null && Number.isFinite(Number(slots)) ? `${slots}명` : "협의";
  const st = job.status || "recruiting";
  const statusText = STATUS_LABEL[st] || st;
  const workTypeText = WORK_TYPE_LABEL[job.workType] || "종일";
  const count = applicantCount(job);
  const applied = hasSelfApplied(job);
  const canApply = canApplyToJob(job);
  const addrLine = getAddressForViewer(job);
  const regionGrid = getPublicRegionLine(job);
  const postedText = formatPostedRelative(job, now);
  const showNew = isNewJobWithin30Min(job, now);
  const urgent = isUrgentJob(job);
  const craftTradeLine = `${formatCraftWithEmoji(job)} · ${trade}`;

  return (
    <div className="map-job-detail-backdrop" role="presentation" onClick={onClose}>
      <div
        className="map-job-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-job-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="map-job-detail-modal__grab" aria-hidden="true" />
        <div className="map-job-detail-modal__head">
          <div className="map-job-detail-modal__head-text">
            <p className="map-job-detail-modal__meta-line">
              <span className={`job-status-badge job-status-badge--${st} job-status-badge--detail`}>{statusText}</span>
              {urgent ? (
                <span className="job-urgent-badge job-urgent-badge--detail" aria-label="급구">
                  🔥 급구
                </span>
              ) : null}
              {showNew ? (
                <span className="job-new-badge job-new-badge--detail" aria-label="최근 공고">
                  NEW
                </span>
              ) : null}
              <span className="map-job-detail-modal__meta-sep">·</span>
              <span>{postedText}</span>
              <span className="map-job-detail-modal__meta-sep">·</span>
              <span>{workTypeText}</span>
            </p>

            <div className="map-job-detail-hero">
              <div className="map-job-detail-hero__craft-trade">{craftTradeLine}</div>
              <div className="map-job-detail-hero__pay">{formatPayDisplay(job.pay)}</div>
            </div>

            <h2 id="map-job-detail-title" className="map-job-detail-modal__title">
              {job.title || "공고"}
            </h2>
            <p className="map-job-detail-modal__addr">{addrLine}</p>
          </div>
          <button type="button" className="map-job-detail-modal__close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className="map-job-detail-modal__body">
          <div className="map-job-detail-grid map-job-detail-grid--priority">
            <div className="map-job-detail-cell">
              <span className="map-job-detail-cell__label">작업 날짜</span>
              <strong className="map-job-detail-cell__value">{formatJobDate(job)}</strong>
            </div>
            <div className="map-job-detail-cell">
              <span className="map-job-detail-cell__label">작업 시간</span>
              <strong className="map-job-detail-cell__value">{formatWorkTime(job)}</strong>
            </div>
            <div className="map-job-detail-cell">
              <span className="map-job-detail-cell__label">지역</span>
              <strong className="map-job-detail-cell__value">{regionGrid}</strong>
            </div>
            <div className="map-job-detail-cell">
              <span className="map-job-detail-cell__label">거리</span>
              <strong className="map-job-detail-cell__value map-job-detail-cell__value--dist">{dist}</strong>
            </div>
            <div className="map-job-detail-cell map-job-detail-cell--wide">
              <span className="map-job-detail-cell__label">현장 유형</span>
              <strong className="map-job-detail-cell__value">
                <span className="map-job-detail-site-emoji" aria-hidden="true">
                  {site.emoji}
                </span>{" "}
                {siteLabel(site)}
              </strong>
            </div>
            <div className="map-job-detail-cell">
              <span className="map-job-detail-cell__label">모집 인원</span>
              <strong className="map-job-detail-cell__value">{slotsText}</strong>
            </div>
            <div className="map-job-detail-cell">
              <span className="map-job-detail-cell__label">지원자</span>
              <strong className="map-job-detail-cell__value">👥 지원자 {count}명</strong>
            </div>
          </div>

          <div className="map-job-detail-desc map-job-detail-desc--lower">
            <h3 className="map-job-detail-desc__title">작업 설명</h3>
            <p className="map-job-detail-desc__text">
              {job.description || job.memo || "현장 안내는 연락 시 안내됩니다."}
            </p>
          </div>
        </div>

        <div className="map-job-detail-modal__foot map-job-detail-modal__foot--split">
          <button type="button" className="map-job-detail-secondary" onClick={() => onShowApplicants?.()}>
            지원자 보기
          </button>
          <button
            type="button"
            className="map-job-detail-apply"
            disabled={!canApply}
            onClick={() => canApply && onApply?.(job)}
          >
            {applied ? "지원완료" : "지원하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
