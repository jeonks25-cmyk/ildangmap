/** 활동지역 — 시 단위 (베타 MVP, 복수 선택) */

export const ACTIVITY_REGIONS = [
  "대전",
  "세종",
  "청주",
  "천안",
  "공주",
  "아산",
  "논산",
  "평택",
  "전국",
];

const LEGACY_TO_CITY = {
  "대전 서구": "대전",
  "대전 유성구": "대전",
  "대전 동구": "대전",
  "대전 중구": "대전",
  "대전 대덕구": "대전",
  "세종 조치원": "세종",
  "청주 상당구": "청주",
  "청주 서원구": "청주",
  "청주 흥덕구": "청주",
  "청주 청원구": "청주",
  "천안 서북구": "천안",
  "천안 동남구": "천안",
};

export function isActivityRegion(value) {
  return ACTIVITY_REGIONS.includes(String(value || "").trim());
}

/** 구·군 단위 레거시 값 → 시 단위 */
export function migrateLegacyRegionToCity(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (isActivityRegion(trimmed)) return trimmed;
  if (LEGACY_TO_CITY[trimmed]) return LEGACY_TO_CITY[trimmed];
  for (const city of ACTIVITY_REGIONS) {
    if (city === "전국") continue;
    if (trimmed.startsWith(city)) return city;
  }
  return "";
}

function dedupeValidRegions(list) {
  const seen = new Set();
  const out = [];
  (Array.isArray(list) ? list : []).forEach((item) => {
    const city = migrateLegacyRegionToCity(item);
    if (!city || !isActivityRegion(city) || seen.has(city)) return;
    seen.add(city);
    out.push(city);
  });
  return out;
}

/**
 * string | string[] | { region, regions } → regions[]
 * 기존 region 단일 값은 첫 번째 항목으로 마이그레이션.
 */
export function normalizeActivityRegions(raw, fallback = ["대전"]) {
  if (Array.isArray(raw)) {
    const next = dedupeValidRegions(raw);
    return next.length ? next : dedupeValidRegions(fallback);
  }
  if (raw && typeof raw === "object") {
    if (Array.isArray(raw.regions) && raw.regions.length) {
      const next = dedupeValidRegions(raw.regions);
      if (next.length) return next;
    }
    const legacy = raw.region ?? raw.homeRegion ?? raw.residence ?? raw.regionLabel;
    const migrated = migrateLegacyRegionToCity(legacy);
    if (migrated) return [migrated];
  }
  if (typeof raw === "string" && raw.trim()) {
    const migrated = migrateLegacyRegionToCity(raw);
    if (migrated) return [migrated];
  }
  return dedupeValidRegions(fallback);
}

/** @deprecated 단일 값 호환 — 첫 지역 반환 */
export function normalizeActivityRegion(value, fallback = "대전") {
  const regions = normalizeActivityRegions(value, [fallback]);
  return regions[0] || fallback;
}

export function formatRegionsLabel(regions, { emptyLabel = "활동지역 선택" } = {}) {
  const list = normalizeActivityRegions(regions);
  if (!list.length) return emptyLabel;
  return list.join(", ");
}

export function getPrimaryRegion(regions, fallback = "대전") {
  const list = normalizeActivityRegions(regions, [fallback]);
  return list[0] || fallback;
}

/** 검색·지도 필터 — filter가 비었거나 전국이면 전체 허용 */
export function matchesActivityRegionFilter(targetRegions, filterRegions) {
  const filters = dedupeValidRegions(filterRegions).filter((r) => r !== "전국");
  if (!filters.length) return true;
  const targets = dedupeValidRegions(targetRegions);
  if (!targets.length) return true;
  if (targets.includes("전국")) return true;
  return targets.some((t) => filters.includes(t));
}
