import { buildScheduleTitle, extractSiteInfo } from "./siteInfoExtractor";

const DATE_UNIT_LINE_RE =
  /(?:(\d{1,2})\s*[/.월]\s*(\d{1,2})\s*(?:일)?|(\d{4})-(\d{1,2})-(\d{1,2}))\s*(?:[^\d]*)?(\d{3,4})\s*동\s*(\d{2,4})\s*호/u;

const DATE_UNIT_COMPACT_RE =
  /(?:(\d{1,2})\s*[/.월]\s*(\d{1,2})\s*(?:일)?)\s*(\d{3,4})동(\d{2,4})호/u;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function normalizeDigits(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function resolveDateKey(month, day, referenceDate = new Date()) {
  const ref = referenceDate instanceof Date ? referenceDate : new Date();
  let year = ref.getFullYear();
  const candidate = new Date(year, month - 1, day);
  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  if (candidate < today - 7 * 86400000) year += 1;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function parseDateFromGroups(m, referenceDate) {
  if (m[6] && m[3] && String(m[3]).length === 4 && Number(m[3]) >= 2000) {
    return `${m[3]}-${pad2(Number(m[4]))}-${pad2(Number(m[5]))}`;
  }
  const mo = Number(m[1]);
  const day = Number(m[2]);
  if (mo >= 1 && mo <= 12 && day >= 1 && day <= 31) {
    return resolveDateKey(mo, day, referenceDate);
  }
  return "";
}

/**
 * 긴 텍스트·다중 캡처에서 날짜+동/호 조합 일정 분리
 * @param {string} text
 * @param {{ referenceDate?: Date, sharedContext?: object }} [options]
 */
export function parseMultiSchedules(text, options = {}) {
  const raw = String(text || "").trim();
  if (!raw) return [];

  const referenceDate = options.referenceDate || new Date();
  const shared = extractSiteInfo(raw);
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const found = [];
  const seen = new Set();

  for (const line of lines) {
    const compact = line.match(DATE_UNIT_COMPACT_RE);
    const spaced = !compact ? line.match(DATE_UNIT_LINE_RE) : null;
    const m = compact || spaced;
    if (!m) continue;

    const dateKey = parseDateFromGroups(m, referenceDate);
    const building = normalizeDigits(m[6] || m[3]);
    const unit = normalizeDigits(m[7] || m[4]);
    if (!building || !unit) continue;

    const key = `${dateKey}|${building}|${unit}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const apartmentName = shared.apartmentName || "";
    const title = buildScheduleTitle({ apartmentName, building, unit });

    found.push({
      id: key,
      selected: true,
      dateKey: dateKey || options.defaultDateKey || "",
      title,
      apartmentName,
      building,
      unit,
      commonPassword: shared.commonPassword,
      housePassword: shared.housePassword,
      workItems: shared.workItems,
      brands: shared.brands,
      craft: shared.craft,
    });
  }

  return found;
}

export function hasMultipleSchedules(text, options = {}) {
  return parseMultiSchedules(text, options).length >= 2;
}
