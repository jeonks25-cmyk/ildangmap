import { MAP_ITEM_TYPE } from "../constants/mapItemTypes";
import { renderEstimateMarkerHtml } from "./estimateSpeechBubbleOverlay";
import { getJobSpeechBubbleHtml } from "./jobSpeechBubbleOverlay";

const TYPE_ICON = {
  [MAP_ITEM_TYPE.SOS]: "🚨",
  [MAP_ITEM_TYPE.ESTIMATE_REQUEST]: "📐",
  [MAP_ITEM_TYPE.HELPER_REQUEST]: "🆘",
  [MAP_ITEM_TYPE.FOOD]: "🍚",
  [MAP_ITEM_TYPE.RESTAURANT]: "🍚",
  [MAP_ITEM_TYPE.RESTROOM]: "🚻",
  [MAP_ITEM_TYPE.PARKING]: "🅿️",
  [MAP_ITEM_TYPE.ACCESS_INFO]: "🏢",
  [MAP_ITEM_TYPE.ELEVATOR]: "🛗",
  [MAP_ITEM_TYPE.MATERIAL_PICKUP]: "🧰",
  [MAP_ITEM_TYPE.MATERIAL_SHARE]: "📦",
  [MAP_ITEM_TYPE.SITE_MEMO]: "📝",
  [MAP_ITEM_TYPE.DANGER]: "⚠️",
  [MAP_ITEM_TYPE.MEETING_PLACE]: "📍",
  [MAP_ITEM_TYPE.MEETING_POINT]: "📍",
  [MAP_ITEM_TYPE.HARDWARE_STORE]: "🧰",
  [MAP_ITEM_TYPE.CONVENIENCE_STORE]: "🏪",
};

function escHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderGenericLifeItemOverlay(item) {
  const tone = item?.tone || item?.type || "life";
  const icon = TYPE_ICON[item?.type] || "📍";

  return `
<div class="geo-life-marker-anchor geo-life-marker-anchor--${escHtml(tone)}">
  <div class="geo-life-marker geo-life-marker--${escHtml(tone)}" aria-hidden="true" tabindex="-1">
    <span class="geo-life-marker__icon" aria-hidden="true">${escHtml(icon)}</span>
  </div>
</div>
`.trim();
}

/**
 * 일당맵 공통 overlay entry point.
 * 현재는 field/estimate 기존 renderer에 위임하고, 생활 정보 타입은 generic renderer를 사용합니다.
 */
export function renderMapItemOverlay(item, options = {}) {
  if (!item) return "";
  if (item.type === MAP_ITEM_TYPE.FIELD) {
    return getJobSpeechBubbleHtml(item.source || item, {
      mode: options.mode || "ops",
      density: options.density || "compact",
    });
  }
  if (item.type === MAP_ITEM_TYPE.ESTIMATE) {
    return renderEstimateMarkerHtml(item.source || item, { ariaLabel: `${item.label || "견적 요청"} ${item.title || ""}` });
  }
  return renderGenericLifeItemOverlay(item);
}
