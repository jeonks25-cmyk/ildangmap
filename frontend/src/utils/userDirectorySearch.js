import { formatRegionsLabel, matchesActivityRegionFilter, normalizeActivityRegions } from "../constants/activityRegions";

export function phoneDigits(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

export function getUserDirectoryRegions(user) {
  return normalizeActivityRegions(user);
}

/**
 * 일당맵 가입자 디렉터리 검색 — 이름·전화·지역 부분 일치 + 활동지역 필터.
 */
export function filterUserDirectory(
  directory,
  query,
  { existingPhones = new Set(), skipIds = new Set(), filterRegions = [] } = {}
) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [];

  const qDigits = phoneDigits(q);
  const regionFilters = normalizeActivityRegions(filterRegions, []);

  return (Array.isArray(directory) ? directory : []).filter((user) => {
    if (!user) return false;
    const id = String(user.id);
    if (skipIds.has(id)) return false;

    const digits = phoneDigits(user.phone);
    if (digits && existingPhones.has(digits)) return false;

    if (!matchesActivityRegionFilter(getUserDirectoryRegions(user), regionFilters)) return false;

    const name = String(user.name || "").toLowerCase();
    const regionBlob = formatRegionsLabel(getUserDirectoryRegions(user)).toLowerCase();
    const role = String(user.role || "").toLowerCase();

    const nameHit = name.includes(q) || name.startsWith(q);
    const phoneHit = qDigits.length >= 3 && digits.includes(qDigits);
    const regionHit = regionBlob.includes(q);

    return nameHit || phoneHit || regionHit || role.includes(q);
  });
}
