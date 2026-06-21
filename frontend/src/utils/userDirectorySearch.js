export function phoneDigits(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

/**
 * 일당맵 가입자 디렉터리 검색 — 이름·전화·지역 부분 일치.
 */
export function filterUserDirectory(directory, query, { existingPhones = new Set(), skipIds = new Set() } = {}) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [];

  const qDigits = phoneDigits(q);
  return (Array.isArray(directory) ? directory : []).filter((user) => {
    if (!user) return false;
    const id = String(user.id);
    if (skipIds.has(id)) return false;

    const digits = phoneDigits(user.phone);
    if (digits && existingPhones.has(digits)) return false;

    const name = String(user.name || "").toLowerCase();
    const region = String(user.region || "").toLowerCase();
    const role = String(user.role || "").toLowerCase();

    const nameHit = name.includes(q) || name.startsWith(q);
    const phoneHit = qDigits.length >= 3 && digits.includes(qDigits);
    const regionHit = region.includes(q);

    return nameHit || phoneHit || regionHit || role.includes(q);
  });
}
