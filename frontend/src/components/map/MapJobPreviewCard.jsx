import React from "react";
import { formatPayShort } from "../../utils/formatPayShort";
import {
  buildFieldJobTitle,
  CRAFT_LABEL,
  getJobCraft,
  getPublicRegionLine,
  isLiveHelpJob,
} from "../../utils/jobModel";
import { normalizeJobTrade } from "../../utils/jobTrade";

export function formatJobPreviewPay(job) {
  return formatPayShort(job?.pay);
}

function formatPreviewTime(job) {
  const t = String(job?.workTime || job?.helpTime || "").trim();
  return t || "시간 협의";
}

function formatPreviewTrade(job) {
  const craft = CRAFT_LABEL[getJobCraft(job)] || "";
  const tradeLabel = normalizeJobTrade(job) || "";
  if (craft && tradeLabel) return `${craft} · ${tradeLabel}`;
  return craft || tradeLabel || "현장";
}

/**
 * 지도 현장 미리보기 카드 — 상세 모달 없이 하단 preview
 */
function MapFieldPreviewCard({
  job,
  onApply,
  onDismiss,
  className = "",
  showActions = true,
}) {
  if (!job) return null;

  const isHelp = isLiveHelpJob(job);
  const title = isHelp ? job.helpTitle || buildFieldJobTitle(job) : buildFieldJobTitle(job);
  const region = getPublicRegionLine(job);
  const pay = formatJobPreviewPay(job);
  const time = formatPreviewTime(job);
  const trade = formatPreviewTrade(job);

  return (
    <div className={`map-job-preview__card${className ? ` ${className}` : ""}`}>
      <div className="map-job-preview__body">
        <strong className="map-job-preview__title">{title}</strong>
        <span className="map-job-preview__pay">{pay}</span>
        <span className="map-job-preview__row">{time}</span>
        <span className="map-job-preview__row">{trade}</span>
        <span className="map-job-preview__row map-job-preview__region">{region || "근처 현장"}</span>
      </div>
      {showActions ? (
        <div className="map-job-preview__actions">
          <button
            type="button"
            className="map-job-preview__btn map-job-preview__btn--primary map-job-preview__btn--full"
            onClick={(e) => {
              e.stopPropagation();
              onApply?.(job);
            }}
          >
            참여 요청
          </button>
        </div>
      ) : null}
      {onDismiss ? (
        <button
          type="button"
          className="map-job-preview__close"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss?.(e);
          }}
          aria-label="미리보기 닫기"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

export default React.memo(MapFieldPreviewCard);
