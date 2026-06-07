/**
 * 견적 요청 3단계 상태 — 일반 현장 연결과 UX 분리
 */

export const QUOTE_STATUS = {
  OPEN: "quote_open",
  VISITING: "quote_visiting",
  CLOSED: "quote_closed",
};

export const QUOTE_STATUS_LABEL = {
  [QUOTE_STATUS.OPEN]: "견적 요청 중",
  [QUOTE_STATUS.VISITING]: "방문견적 진행중",
  [QUOTE_STATUS.CLOSED]: "업체선정 완료",
};

/** @deprecated 레거시 status → quoteStatus */
const LEGACY_STATUS_MAP = {
  open: QUOTE_STATUS.OPEN,
  quoted: QUOTE_STATUS.VISITING,
  visiting: QUOTE_STATUS.VISITING,
  closed: QUOTE_STATUS.CLOSED,
  done: QUOTE_STATUS.CLOSED,
};

/**
 * @param {object} request
 * @returns {typeof QUOTE_STATUS[keyof typeof QUOTE_STATUS]}
 */
export function normalizeQuoteStatus(request) {
  const explicit = request?.quoteStatus || request?.quote_state;
  if (explicit && Object.values(QUOTE_STATUS).includes(explicit)) return explicit;
  const legacy = LEGACY_STATUS_MAP[String(request?.status || "").toLowerCase()];
  return legacy || QUOTE_STATUS.OPEN;
}

export function isQuoteOpen(status) {
  return status === QUOTE_STATUS.OPEN;
}

export function isQuoteVisiting(status) {
  return status === QUOTE_STATUS.VISITING;
}

export function isQuoteClosed(status) {
  return status === QUOTE_STATUS.CLOSED;
}

/** 지도에 표시할 견적 (요청중 + 방문중) */
export function isQuoteVisibleOnMap(request) {
  if (!request) return false;
  const status = normalizeQuoteStatus(request);
  return status === QUOTE_STATUS.OPEN || status === QUOTE_STATUS.VISITING;
}

/** 마커 CSS modifier (geo-estimate-marker--open | --visiting) */
export function getQuoteMarkerModifier(request) {
  const status = normalizeQuoteStatus(request);
  if (status === QUOTE_STATUS.VISITING) return "visiting";
  if (status === QUOTE_STATUS.OPEN) return "open";
  return "closed";
}

export function getQuoteStatusLabel(request) {
  return QUOTE_STATUS_LABEL[normalizeQuoteStatus(request)] || "견적";
}

/** 오야지 견적 응답 가능 여부 */
export function canSupportQuoteRequest(request) {
  return normalizeQuoteStatus(request) === QUOTE_STATUS.OPEN;
}
