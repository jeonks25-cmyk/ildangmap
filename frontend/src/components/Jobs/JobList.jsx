import React from "react";
import { getTradeAccentKey, normalizeJobTrade } from "../../overlays/jobSpeechBubbleOverlay";

function formatDistanceKm(job, index) {
  if (job?.distanceKm != null && Number.isFinite(Number(job.distanceKm))) {
    return `${Number(job.distanceKm).toFixed(1)}km`;
  }
  const base = 0.55 + (index % 6) * 0.28;
  return `${base.toFixed(1)}km`;
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
        return (
          <div
            key={`${job.id ?? `${job.title}-${job.lat}-${job.lng}`}${idSuffix}`}
            onClick={() => onJobClick(job)}
            className={`job-card job-card--geo job-card--accent-${accent} ${
              isSelected ? "selected-job" : ""
            }`}
            id={cardId}
            data-trade={trade}
          >
            <div className="job-top-row">
              <span className="job-type-badge job-type-badge--geo">{trade}</span>
              <span className="job-distance-pill job-distance-pill--geo">{dist}</span>
            </div>

            <strong className="job-card__title-geo">{job?.title ?? ""}</strong>

            <div className="job-info-row job-info-row--geo">
              <div className="job-loc-pay">
                <p className="job-loc-line">📍 {job?.shortAddress || job?.address || ""}</p>
                <div className="job-pay-text job-pay-text--geo">{job?.pay ?? ""}</div>
              </div>

              <button
                type="button"
                className="job-apply-btn job-apply-btn--geo"
                onClick={(e) => {
                  e.stopPropagation();
                  onApplyJob(job);
                }}
              >
                지원하기
              </button>
            </div>

            <div className="job-applicants-badge job-applicants-badge--geo">
              👤 {job?.applicants ?? 0}
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
