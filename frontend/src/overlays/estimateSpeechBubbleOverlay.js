/**
 * 견적 요청 지도 마커 — 호갱노노형 집 실루엣 + 상태별 스타일
 */

import {
  getQuoteMapDisplayKind,
  getQuoteMapDisplayLabel,
  getQuoteMapDisplayModifier,
} from "../constants/quoteMapDisplay";
import { getQuoteStatusLabel, normalizeQuoteStatus } from "../constants/quoteStatus";
import { getEstimateSupporterCount } from "../utils/estimateRequestModel";

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getEstimateMarkerSubline(request) {
  const area = String(request?.area || "").trim();
  const category =
    String(request?.category || "").trim() ||
    String(request?.craftLabel || "").trim();
  if (area && category) return `${area} | ${category}`;
  if (area) return area;
  if (category) return category;
  return "";
}

/**
 * 마커 보조 라벨 (구조만 — UI는 심플 유지, 값 있을 때만 DOM 노출)
 * @returns {{ text: string, kind: 'new_today'|'supporters'|'custom'|'' }}
 */
export function getEstimateMarkerBadge(request) {
  if (request?.markerBadge?.text) {
    return {
      text: String(request.markerBadge.text).trim(),
      kind: request.markerBadge.kind || "custom",
    };
  }
  if (request?.isNewToday || request?.showNewTodayBadge) {
    return { text: "오늘 신규", kind: "new_today" };
  }
  const count = getEstimateSupporterCount(request);
  if (count > 0) {
    return { text: `${count}명 견적중`, kind: "supporters" };
  }
  return { text: "", kind: "" };
}

/**
 * @param {object} request
 * @param {{ ariaLabel?: string }} [opts]
 */
export function renderEstimateMarkerHtml(request, opts = {}) {
  const status = normalizeQuoteStatus(request);
  const displayModifier = getQuoteMapDisplayModifier(request);
  const displayLabel = getQuoteMapDisplayLabel(request) || getQuoteStatusLabel(request);
  const displayKind = getQuoteMapDisplayKind(request);
  const sub = getEstimateMarkerSubline(request);
  const badge = getEstimateMarkerBadge(request);

  const aria =
    opts.ariaLabel ||
    (sub ? `견적 ${displayLabel} ${sub}` : `견적 ${displayLabel}`);

  const badgeHtml = badge.text
    ? `<span class="geo-estimate-marker__badge geo-estimate-marker__badge--${escHtml(badge.kind || "custom")}">${escHtml(badge.text)}</span>`
    : "";

  const statusHtml = displayKind
    ? `<span class="geo-estimate-marker__status">${escHtml(displayLabel)}</span>`
    : "";

  return `
<div class="geo-estimate-marker-anchor geo-estimate-marker-anchor--${escHtml(displayModifier)}" data-quote-status="${escHtml(status)}" data-quote-display="${escHtml(displayKind || "")}">
  <div class="geo-estimate-marker geo-estimate-marker--${escHtml(displayModifier)}" role="button" tabindex="0" aria-label="${escHtml(aria)}">
    <span class="geo-estimate-marker__roof" aria-hidden="true"></span>
    <span class="geo-estimate-marker__label">견적</span>
    ${statusHtml}
    ${badgeHtml}
  </div>
</div>
`.trim();
}

/**
 * @param {object} request
 */
export function getEstimateSpeechBubbleHtml(request) {
  return renderEstimateMarkerHtml(request);
}
