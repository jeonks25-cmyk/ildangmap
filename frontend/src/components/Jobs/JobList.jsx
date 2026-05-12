import React from "react";
import { getTradeAccentKey, normalizeJobTrade } from "../../utils/jobTrade";
import {
  STATUS_LABEL,
  WORK_TYPE_LABEL,
  applicantCount,
  canApplyToJob,
  formatPostedRelative,
  getAddressForViewer,
  hasSelfApplied,
  isNewJobWithin30Min,
  isUrgentJob,
} from "../../utils/jobModel";

function formatDistanceKm(job, index) {
  if (job?.distanceKm != null && Number.isFinite(Number(job.distanceKm))) {
    return `${Number(job.distanceKm).toFixed(1)}km`;
  }
  const base = 0.55 + (index % 6) * 0.28;
  return `${base.toFixed(1)}km`;
}

function formatWorkTime(job, index) {
  if (job?.workTime) return String(job.workTime);
  if (job?.startTime && job?.endTime) return `${job.startTime} ~ ${job.endTime}`;
  const slots = ["07:00 ~ 16:00", "08:00 ~ 17:00", "09:00 ~ 18:00"];
  return slots[index % slots.length];
}

function inferTradeVisual(job, trade) {
  const source = `${job?.title || ""} ${trade || ""}`;
  if (/필름/.test(source)) return { key: "film", label: "필름" };
  if (/도배|벽지/.test(source)) return { key: "wallpaper", label: "도배" };
  if (/타일/.test(source)) return { key: "tile", label: "타일" };
  if (/전기|배선/.test(source)) return { key: "electric", label: "전기" };
  return { key: "film", label: trade || "필름" };
}

function buildTags(job, index) {
  if (Array.isArray(job?.tags) && job.tags.length) return job.tags.slice(0, 4);
  const presets = [
    ["당일지급", "급구"],
    ["초보가능", "식대제공"],
    ["장기", "출퇴근"],
    ["급구", "경력우대"],
  ];
  return presets[index % presets.length];
}

const JobList = ({
  jobs,
  selectedJob,
  onJobClick,
  onApplyJob,
  idSuffix = "",
  listClassName = "",
}) => {
  const list = Array.isArray(jobs) ? jobs : [];
  return (
    <div className={`job-list ${listClassName}`.trim()}>
      {list.map((job, index) => {
        if (!job) return null;
        const isSelected = selectedJob?.id === job?.id;
        const cardId = `job-card-${job.id}${idSuffix}`;
        const trade = normalizeJobTrade(job);
        const accent = getTradeAccentKey(job);
        const dist = formatDistanceKm(job, index);
        const workTime = formatWorkTime(job, index);
        const tags = buildTags(job, index);
        const visual = inferTradeVisual(job, trade);
        const st = job.status || "recruiting";
        const statusText = STATUS_LABEL[st] || st;
        const workTypeText = WORK_TYPE_LABEL[job.workType] || "종일";
        const appCount = applicantCount(job);
        const regionLine = getAddressForViewer(job);
        const applied = hasSelfApplied(job);
        const canApply = canApplyToJob(job);
        const now = new Date();
        const postedText = formatPostedRelative(job, now);
        const showNew = isNewJobWithin30Min(job, now);
        const urgent = isUrgentJob(job);
        return (
          <div
            key={`${job.id ?? `${job.title}-${job.lat}-${job.lng}`}${idSuffix}`}
            onClick={() => onJobClick(job)}
            className={`job-card job-card--geo job-card--accent-${accent} ${
              isSelected ? "selected-job" : ""
            } job-card--trade-${visual.key}`}
            id={cardId}
            data-trade={trade}
          >
            <div className="job-top-row">
              <span className={`job-status-badge job-status-badge--${st} job-status-badge--tiny`}>{statusText}</span>
              {urgent ? (
                <span className="job-urgent-badge job-urgent-badge--tiny" aria-label="급구">
                  🔥
                </span>
              ) : null}
              {showNew ? (
                <span className="job-new-badge job-new-badge--tiny" aria-hidden="true">
                  NEW
                </span>
              ) : null}
              <span className="job-worktype-badge job-worktype-badge--tiny">{workTypeText}</span>
              <span className={`job-type-badge job-type-badge--geo job-type-badge--${visual.key}`}>{visual.label}</span>
              <span className="job-distance-pill job-distance-pill--geo">{dist}</span>
            </div>

            <strong className="job-card__title-geo">{job?.title ?? ""}</strong>
            <p className="job-card-posted-line">{postedText}</p>
            <div className="job-pay-text job-pay-text--geo job-pay-text--prominent">{job?.pay ?? ""}</div>

            <div className="job-card-meta-stack">
              <p className="job-loc-line">📍 {regionLine} · {dist}</p>
              <p className="job-time-line">⏰ {workTime}</p>
            </div>

            <div className="job-tag-wrap">
              {tags.map((tag) => (
                <span key={`${cardId}-${tag}`} className="job-tag-chip">
                  #{tag}
                </span>
              ))}
            </div>

            <div className="job-info-row job-info-row--geo">
              <div className="job-applicants-inline">👥 지원자 {appCount}명</div>

              <button
                type="button"
                className="job-apply-btn job-apply-btn--geo"
                disabled={!canApply}
                onClick={(e) => {
                  e.stopPropagation();
                  if (canApply) onApplyJob(job);
                }}
              >
                {applied ? "지원완료" : "지원하기"}
              </button>
            </div>
          </div>
        );
      })}
      {list.length === 0 && (
        <div className="job-list-empty">주변에 등록된 공고가 없습니다.</div>
      )}
    </div>
  );
};

export default JobList;
