import { CRAFT_LABEL } from "./jobModel";
import {
  canSupportQuoteRequest,
  isQuoteVisibleOnMap,
  normalizeQuoteStatus,
  QUOTE_STATUS,
} from "../constants/quoteStatus";

export { normalizeQuoteStatus, canSupportQuoteRequest, isQuoteVisibleOnMap, QUOTE_STATUS };

export function isEstimateRequest(item) {
  return item?.type === "estimate";
}

/** 지도·기회 목록용 — 날짜 무관, 요청중·방문중만 */
export function getEstimateRequests(requests) {
  return (Array.isArray(requests) ? requests : []).filter(
    (item) => item && isEstimateRequest(item) && isQuoteVisibleOnMap(item)
  );
}

export function filterEstimatesInMapBounds(estimates, mapBounds) {
  if (!mapBounds) return [];
  const { minLat, maxLat, minLng, maxLng } = mapBounds;
  return (Array.isArray(estimates) ? estimates : []).filter((item) => {
    const lat = Number(item?.lat);
    const lng = Number(item?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
  });
}

/** 견적 희망일 YYYY-MM-DD (없으면 "") — 상세/일정 표시용 */
export function getEstimateRequestDateKey(request) {
  const raw = request?.requestDate || request?.preferredDate || request?.workDate || "";
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatEstimateRequestDate(request) {
  const raw = request?.requestDate || request?.preferredDate;
  if (!raw) return "일정 협의";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return String(raw);
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${m}/${d}`;
}

export function getEstimateCategoryLabel(request) {
  if (request?.category) return String(request.category).trim();
  const craft = request?.craft;
  return CRAFT_LABEL[craft] || craft || "시공";
}

export function getEstimateRegionLine(request) {
  return (
    String(request?.region || "").trim() ||
    String(request?.shortRegion || "").trim() ||
    "지역 미정"
  );
}

export function hasViewerSupportedEstimate(request, viewerUserId) {
  if (!request || viewerUserId == null) return false;
  const supporters = Array.isArray(request.supporters) ? request.supporters : [];
  return supporters.some((s) => s && String(s.userId) === String(viewerUserId));
}

export function getEstimateSupporterCount(request) {
  return Array.isArray(request?.supporters) ? request.supporters.length : 0;
}
