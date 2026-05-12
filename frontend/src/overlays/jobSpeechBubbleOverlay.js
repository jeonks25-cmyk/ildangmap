/**
 * 지도 마커 HTML (카카오 CustomOverlay)
 * 당근 동네지도 스타일 말풍선: 금액(만) + 부가 한 줄(긴급/프리미엄/오늘)
 */

import { getMapMarkerTone, isJobWorkDateToday, isUrgentJob } from "../utils/jobModel";

export { normalizeJobTrade, TRADE_KEYS, TRADE_META, resolveSiteType, getTradeAccentKey } from "../utils/jobTrade";

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 지도 마커: 만 원 단위 (140000 → 14만) */
function formatPayManLabel(pay) {
  const n = Number(String(pay ?? "").replace(/[^0-9]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return "?만";
  const m = Math.round(n / 10000);
  const clipped = Math.min(Math.max(m, 1), 999);
  return `${clipped}만`;
}

function getMarkerSubline(job) {
  if (!job) return "";
  if (isUrgentJob(job)) return "긴급";
  if (job.isPremium) return "프리미엄";
  if (isJobWorkDateToday(job)) return "오늘";
  return "";
}

export function getJobSpeechBubbleHtml(job) {
  const payLabel = formatPayManLabel(job?.pay);
  const tone = getMapMarkerTone(job);
  const sub = getMarkerSubline(job);
  const payE = escHtml(payLabel);
  const subE = sub ? escHtml(sub) : "";
  const n = Number(String(job?.pay ?? "").replace(/[^0-9]/g, ""));
  const man = Number.isFinite(n) && n > 0 ? Math.round(n / 10000) : null;
  const ariaCore = man != null && man >= 1 ? `현장 일당 약 ${man}만 원` : "현장 일당 협의";
  const ariaExtra = sub ? `, ${sub}` : "";
  const ariaLabel = escHtml(`${ariaCore}${ariaExtra}`);

  const subBlock = sub
    ? `<div class="job-pin-marker__sub">${subE}</div>`
    : "";

  return `
<div class="job-pin-marker-anchor">
  <div
    class="job-pin-marker job-pin-marker--tone-${tone}"
    role="button"
    tabindex="0"
    aria-label="${ariaLabel}"
  >
    <div class="job-pin-marker__box">
      <div class="job-pin-marker__pay">${payE}</div>
      ${subBlock}
    </div>
    <div class="job-pin-marker__tail" aria-hidden="true"></div>
  </div>
</div>
`.trim();
}
