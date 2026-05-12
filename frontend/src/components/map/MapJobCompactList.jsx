import React from "react";
import {
  CRAFT_LABEL,
  getJobCraft,
  isJobWorkDateToday,
  isUrgentJob,
} from "../../utils/jobModel";
import { normalizeJobTrade } from "../../utils/jobTrade";

function formatPayMain(pay) {
  const n = Number(String(pay ?? "").replace(/[^0-9]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return String(pay || "-").replace(/\s*원\s*$/, "") || "-";
  return n.toLocaleString();
}

function formatDistanceKm(job, index) {
  if (job?.distanceKm != null && Number.isFinite(Number(job.distanceKm))) {
    const num = Number(job.distanceKm);
    if (num < 1) return `${Math.round(num * 1000)}m`;
    return `${num.toFixed(1)}km`;
  }
  const base = 0.55 + (index % 6) * 0.28;
  return `${base.toFixed(1)}km`;
}

function formatWorkTimeShort(job, index) {
  if (job?.workTime) return String(job.workTime);
  if (job?.startTime && job?.endTime) return `${job.startTime}~${job.endTime}`;
  const slots = ["08:00~17:00", "07:30~16:00", "09:00~18:00"];
  return slots[index % slots.length];
}

function formatPayTerms(job) {
  const direct = job?.payTerms ?? job?.paymentTerms ?? job?.payCondition;
  if (direct && String(direct).trim()) return String(direct).trim();
  const tagStr = (Array.isArray(job?.tags) ? job.tags : []).map(String).join(" ");
  const blob = `${job?.title || ""} ${job?.memo || ""} ${job?.description || ""} ${tagStr}`;
  if (/당일\s*지급|당일지급|당일/.test(blob)) return "당일지급";
  if (/주급|주당/.test(blob)) return "주급";
  if (/익일|명일/.test(blob)) return "익일지급";
  return "협의";
}

function formatPayManBadge(pay) {
  const n = Number(String(pay ?? "").replace(/[^0-9]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return "?만";
  const m = Math.round(n / 10000);
  const c = Math.min(Math.max(m, 1), 999);
  return `${c}만`;
}

function craftPillClass(craft) {
  const c = craft && String(craft);
  if (c && /^[a-z]+$/.test(c)) return `map-craft-pill map-craft-pill--${c}`;
  return "map-craft-pill map-craft-pill--film";
}

function stopHeart(e) {
  e.preventDefault();
  e.stopPropagation();
}

function getDongFromRegion(job) {
  const parts = String(job?.shortRegion || job?.shortAddress || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return parts[parts.length - 1] || "";
}

/** 지역 + 현장종류 + 공정 + 직군 (현장 카드용) */
function buildFieldCardTitle(job) {
  if (!job) return "공고";
  if (typeof job.fieldTitle === "string" && job.fieldTitle.trim()) return job.fieldTitle.trim();
  const dong = getDongFromRegion(job);
  const site = String(job.siteKind || "").trim();
  const craft = getJobCraft(job);
  const craftLabel = CRAFT_LABEL[craft] || "";
  const trade = normalizeJobTrade(job);
  const parts = [dong, site, craftLabel, trade].filter(Boolean);
  if (parts.length >= 2) return parts.join(" ");
  return String(job.title || "공고").trim() || "공고";
}

function getFieldCardBadges(job) {
  if (!job) return [];
  const badges = [];
  if (isUrgentJob(job)) badges.push({ key: "urgent", label: "긴급", tone: "urgent" });
  if (isJobWorkDateToday(job)) badges.push({ key: "today", label: "당일", tone: "today" });
  if (job.beginnerOk) badges.push({ key: "beginner", label: "초보가능", tone: "soft" });
  if (job.longTerm) badges.push({ key: "long", label: "장기", tone: "soft" });
  if (job.workType === "morning") badges.push({ key: "am", label: "오전만", tone: "time" });
  if (job.workType === "shortHelp") badges.push({ key: "help", label: "오후헬프", tone: "time" });
  return badges;
}

export default function MapJobCompactList({ jobs, selectedJob, onRowClick, variant = "default" }) {
  const list = Array.isArray(jobs) ? jobs : [];
  const isSheet = variant === "sheet";
  const isFeed = variant === "feed";
  const isSheetOrFeed = isSheet || isFeed;

  if (isSheetOrFeed && list.length === 0) {
    return (
      <div
        className={`map-job-compact-list map-job-compact-list--sheet${isFeed ? " map-job-compact-list--feed" : ""}`}
        role="list"
      >
        <div className="map-job-sheet-empty" role="status">
          <p className="map-job-sheet-empty__title">현재 지도 범위에 공고가 없습니다</p>
          <p className="map-job-sheet-empty__sub">날짜나 위치를 변경해보세요</p>
        </div>
      </div>
    );
  }

  if (isFeed) {
    return (
      <div className="map-job-compact-list map-job-compact-list--feed" role="list">
        {list.map((job, index) => {
          if (!job) return null;
          const isSelected = selectedJob?.id === job.id;
          const dist = formatDistanceKm(job, index);
          const timeShort = formatWorkTimeShort(job, index);
          const titleText = buildFieldCardTitle(job);
          const payMan = formatPayManBadge(job.pay);
          const payTerms = formatPayTerms(job);
          const badges = getFieldCardBadges(job);
          const payAria = `${payMan} 일당, ${titleText}`;

          return (
            <button
              key={job.id ?? `${job.title}-${index}`}
              type="button"
              role="listitem"
              data-job-id={job.id != null ? String(job.id) : undefined}
              className={`map-job-feed-row map-job-feed-row--field${isSelected ? " is-selected" : ""}`}
              onClick={() => onRowClick?.(job)}
              aria-label={payAria}
            >
              <span className="map-job-feed-row__pay-box" aria-hidden="true">
                <span className="map-job-feed-row__pay-box-inner">
                  <span className="map-job-feed-row__pay-box-bracket">[</span>
                  <span className="map-job-feed-row__pay-box-num">{payMan}</span>
                  <span className="map-job-feed-row__pay-box-bracket">]</span>
                </span>
              </span>
              <span className="map-job-feed-row__body map-job-feed-row__body--field">
                {badges.length ? (
                  <span className="map-job-feed-row__badges" aria-hidden="true">
                    {badges.map((b) => (
                      <span key={b.key} className={`map-job-feed-badge map-job-feed-badge--${b.tone}`}>
                        {b.label}
                      </span>
                    ))}
                  </span>
                ) : null}
                <span className="map-job-feed-row__title map-job-feed-row__title--field">{titleText}</span>
                <span className="map-job-feed-row__time">{timeShort}</span>
                <span className="map-job-feed-row__meta-line">
                  {dist}
                  <span className="map-job-feed-row__dot"> · </span>
                  {payTerms}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  if (isSheet) {
    return (
      <div className="map-job-compact-list map-job-compact-list--sheet" role="list">
        {list.map((job, index) => {
          if (!job) return null;
          const isSelected = selectedJob?.id === job.id;
          const craft = getJobCraft(job);
          const dist = formatDistanceKm(job, index);
          const payNum = formatPayMain(job.pay);
          const urgent = isUrgentJob(job);
          const timeShort = formatWorkTimeShort(job, index);
          const titleText = job.title || "공고";
          const payBadge = formatPayManBadge(job.pay);

          return (
            <button
              key={job.id ?? `${job.title}-${index}`}
              type="button"
              role="listitem"
              data-job-id={job.id != null ? String(job.id) : undefined}
              className={`map-job-compact-row map-job-compact-row--sheet${isSelected ? " is-selected" : ""}`}
              onClick={() => onRowClick?.(job)}
            >
              <span
                className={`map-job-sheet-pay-badge map-job-sheet-pay-badge--${craft}`}
                aria-hidden="true"
              >
                <span className="map-job-sheet-pay-badge__man">{payBadge}</span>
                {urgent ? <span className="map-job-sheet-pay-badge__sub">급구</span> : null}
              </span>
              <div className="map-job-compact-row__mid map-job-compact-row__mid--sheet">
                <p className="map-job-compact-row__sheet-title">{titleText}</p>
                <p className="map-job-compact-row__sheet-meta">
                  {timeShort}
                  <span className="map-job-compact-row__dot"> · </span>
                  {dist}
                </p>
              </div>
              <div className="map-job-compact-row__rail">
                <span
                  className="map-job-compact-row__heart"
                  aria-hidden="true"
                  onClick={stopHeart}
                  onPointerDown={stopHeart}
                >
                  ♡
                </span>
                <div className="map-job-compact-row__pay-stack" aria-label={`급여 ${payNum}원`}>
                  <span
                    className={`map-job-compact-row__pay-won map-job-compact-row__pay-won--sheet map-job-compact-row__pay-won--c-${craft}`}
                  >
                    {payNum}
                  </span>
                  <span
                    className={`map-job-compact-row__pay-unit map-job-compact-row__pay-unit--sheet map-job-compact-row__pay-unit--c-${craft}`}
                  >
                    원
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="map-job-compact-list" role="list">
      {list.map((job, index) => {
        if (!job) return null;
        const isSelected = selectedJob?.id === job.id;
        const craft = getJobCraft(job);
        const craftLabel = CRAFT_LABEL[craft] || "현장";
        const dist = formatDistanceKm(job, index);
        const payNum = formatPayMain(job.pay);
        const urgent = isUrgentJob(job);
        const timeShort = formatWorkTimeShort(job, index);
        const trade = normalizeJobTrade(job);
        const payTerms = formatPayTerms(job);
        return (
          <button
            key={job.id ?? `${job.title}-${index}`}
            type="button"
            role="listitem"
            data-job-id={job.id != null ? String(job.id) : undefined}
            className={`map-job-compact-row${isSelected ? " is-selected" : ""}`}
            onClick={() => onRowClick?.(job)}
          >
            <div className="map-job-compact-row__grid">
              <div className="map-job-compact-row__body">
                <div className="map-job-compact-row__title-line">
                  <span className={craftPillClass(craft)}>
                    <span className="map-craft-pill__bracket" aria-hidden="true">
                      [
                    </span>
                    {craftLabel}
                    <span className="map-craft-pill__bracket" aria-hidden="true">
                      ]
                    </span>
                  </span>
                  <span className="map-job-compact-row__title">{job.title || "공고"}</span>
                  {urgent ? (
                    <span className="map-job-compact-row__urgent-pill" aria-label="급구">
                      급구
                    </span>
                  ) : null}
                </div>
                <p className="map-job-compact-row__meta">
                  {timeShort}
                  <span className="map-job-compact-row__dot"> · </span>
                  {dist}
                </p>
                <p className="map-job-compact-row__footer">
                  {trade}
                  <span className="map-job-compact-row__dot"> · </span>
                  {payTerms}
                </p>
              </div>
              <div className="map-job-compact-row__pay" aria-label={`급여 ${payNum}원`}>
                <span className="map-job-compact-row__pay-won">{payNum}</span>
                <span className="map-job-compact-row__pay-unit">원</span>
              </div>
            </div>
          </button>
        );
      })}
      {list.length === 0 ? <div className="job-list-empty">주변에 등록된 공고가 없습니다.</div> : null}
    </div>
  );
}
