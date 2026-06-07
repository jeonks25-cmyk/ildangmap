/**
 * 지도 견적 마커 표시 단계 (색상만 살짝 변경)
 */
import { normalizeQuoteStatus, QUOTE_STATUS } from "./quoteStatus";
import { getEstimateSupporterCount } from "../utils/estimateRequestModel";

export const QUOTE_MAP_DISPLAY = {
  NEW: "new",
  VISIT: "visit",
  NEGOTIATING: "negotiating",
  CLOSING: "closing",
};

export const QUOTE_MAP_DISPLAY_LABEL = {
  [QUOTE_MAP_DISPLAY.NEW]: "신규 견적",
  [QUOTE_MAP_DISPLAY.VISIT]: "방문 예정",
  [QUOTE_MAP_DISPLAY.NEGOTIATING]: "협의중",
  [QUOTE_MAP_DISPLAY.CLOSING]: "마감임박",
};

/**
 * @param {object} request
 * @returns {typeof QUOTE_MAP_DISPLAY[keyof typeof QUOTE_MAP_DISPLAY] | null}
 */
export function getQuoteMapDisplayKind(request) {
  if (!request) return null;
  const status = normalizeQuoteStatus(request);
  if (status === QUOTE_STATUS.CLOSED) return null;
  if (status === QUOTE_STATUS.VISITING) return QUOTE_MAP_DISPLAY.VISIT;
  if (request.quoteMapDisplay && QUOTE_MAP_DISPLAY_LABEL[request.quoteMapDisplay]) {
    return request.quoteMapDisplay;
  }
  if (request.closingSoon || request.quoteUrgency === "closing") {
    return QUOTE_MAP_DISPLAY.CLOSING;
  }
  const supporters = getEstimateSupporterCount(request);
  if (supporters >= 2) return QUOTE_MAP_DISPLAY.NEGOTIATING;
  if (request.isNewToday) return QUOTE_MAP_DISPLAY.NEW;
  return QUOTE_MAP_DISPLAY.NEW;
}

export function getQuoteMapDisplayLabel(request) {
  const kind = getQuoteMapDisplayKind(request);
  return kind ? QUOTE_MAP_DISPLAY_LABEL[kind] : "";
}

export function getQuoteMapDisplayModifier(request) {
  const kind = getQuoteMapDisplayKind(request);
  return kind ? `display-${kind}` : "display-new";
}
