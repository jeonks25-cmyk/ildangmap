/** 활동지역 — 시·군·구 단위 (MVP localStorage, Phase 2 Railway 확장 예정) */

export const ACTIVITY_REGIONS = [
  "대전 서구",
  "대전 유성구",
  "대전 동구",
  "대전 중구",
  "대전 대덕구",
  "세종",
  "세종 조치원",
  "청주 상당구",
  "청주 서원구",
  "청주 흥덕구",
  "청주 청원구",
  "천안 서북구",
  "천안 동남구",
  "공주",
  "아산",
  "논산",
  "전국",
];

export function isActivityRegion(value) {
  return ACTIVITY_REGIONS.includes(String(value || "").trim());
}

export function normalizeActivityRegion(value, fallback = "대전 서구") {
  const trimmed = String(value || "").trim();
  if (isActivityRegion(trimmed)) return trimmed;
  return fallback;
}
