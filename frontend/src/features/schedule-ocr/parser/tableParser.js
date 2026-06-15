import { createScheduleOcrDraft } from "../generator/scheduleDraftModel";

const PROCESS_NOISE = /^(일|월|화|수|목|금|토|공정표|페이지|공사명|주차|현장|비고|합계|총계)$/u;
const META_LINE = /공사명|주차|현장여건|천재지변|페이지|공정표/u;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toDateKey(year, month, day) {
  if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function resolveYear(month, referenceDate) {
  const ref = referenceDate instanceof Date ? referenceDate : new Date();
  let year = ref.getFullYear();
  const todayMonth = ref.getMonth() + 1;
  if (month < todayMonth - 1) year += 1;
  return year;
}

function detectMonthYear(text, referenceDate) {
  const ref = referenceDate instanceof Date ? referenceDate : new Date();
  const m1 = String(text).match(/(\d{4})\s*년?\s*(\d{1,2})\s*월/u);
  if (m1) return { year: Number(m1[1]), month: Number(m1[2]) };
  const m2 = String(text).match(/(\d{1,2})\s*월\s*공정표/u);
  if (m2) return { year: resolveYear(Number(m2[1]), ref), month: Number(m2[1]) };
  const m3 = String(text).match(/(\d{1,2})\s*월/u);
  if (m3) return { year: resolveYear(Number(m3[1]), ref), month: Number(m3[1]) };
  return { year: ref.getFullYear(), month: ref.getMonth() + 1 };
}

function isProcessTitle(value) {
  const v = String(value || "").trim();
  if (v.length < 2 || v.length > 20) return false;
  if (PROCESS_NOISE.test(v)) return false;
  if (/^\d+$/.test(v)) return false;
  if (!/[가-힣]/.test(v)) return false;
  return /(공사|공정|작업|필름|도배|타일|전기|설비|도장|철거|방수|목공|미장|조적|석고|도어|창호|페인트|줄눈|코킹|보양|설계|소방|배관|석면|타설)/u.test(v);
}

function pushItem(map, dateKey, title) {
  if (!dateKey || !isProcessTitle(title)) return;
  const key = `${dateKey}::${title}`;
  if (map.has(key)) return;
  map.set(key, { dateKey, title: String(title).trim() });
}

/**
 * @param {string} text
 * @param {{ referenceDate?: Date, month?: number, year?: number }} [options]
 * @returns {{ items: { dateKey: string, title: string }[], month: number, year: number, method: string }}
 */
export function parseScheduleTableText(text, options = {}) {
  const raw = String(text || "");
  const lines = raw
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const detected = detectMonthYear(raw, options.referenceDate);
  const year = options.year || detected.year;
  const month = options.month || detected.month;
  const map = new Map();

  lines.forEach((line) => {
    if (META_LINE.test(line)) return;

    let match = line.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s+(.+)$/u);
    if (match) {
      pushItem(map, toDateKey(Number(match[1]), Number(match[2]), Number(match[3])), match[4]);
      return;
    }

    match = line.match(/^(\d{1,2})\s*월\s*(\d{1,2})\s*일\s+(.+)$/u);
    if (match) {
      pushItem(map, toDateKey(resolveYear(Number(match[1]), options.referenceDate), Number(match[1]), Number(match[2])), match[3]);
      return;
    }

    match = line.match(/^(\d{1,2})[/.](\d{1,2})\s+(.+)$/u);
    if (match) {
      const m = Number(match[1]);
      const d = Number(match[2]);
      const y = m >= 1 && m <= 12 ? resolveYear(m, options.referenceDate) : year;
      const mo = m >= 1 && m <= 12 ? m : month;
      const day = m >= 1 && m <= 12 ? d : m;
      pushItem(map, toDateKey(y, mo, day), match[3]);
      return;
    }

    match = line.match(/^(\d{1,2})\s+([가-힣][가-힣0-9]{1,14})$/u);
    if (match) {
      const day = Number(match[1]);
      if (day >= 1 && day <= 31) {
        pushItem(map, toDateKey(year, month, day), match[2]);
      }
    }
  });

  const dayTitlePattern = /(\d{1,2})\s*일?\s*([가-힣][가-힣0-9]{1,14})/gu;
  let dm;
  while ((dm = dayTitlePattern.exec(raw)) !== null) {
    const day = Number(dm[1]);
    if (day >= 1 && day <= 31) {
      pushItem(map, toDateKey(year, month, day), dm[2]);
    }
  }

  const items = [...map.values()].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  return { items, month, year, method: "line_regex" };
}

/**
 * @param {{ text: string, words?: { text: string, bbox: { x0: number, y0: number, x1: number, y1: number } }[] }} input
 */
export function parseScheduleTable(input, options = {}) {
  const textResult = parseScheduleTableText(input?.text || "", options);
  const words = Array.isArray(input?.words) ? input.words : [];

  if (textResult.items.length >= 2 || !words.length) {
    return { ...textResult, method: textResult.items.length ? textResult.method : "none" };
  }

  const rows = clusterWordsByRow(words);
  const detected = detectMonthYear(input.text || "", options.referenceDate);
  const year = options.year || detected.year;
  const month = options.month || detected.month;
  const map = new Map(textResult.items.map((item) => [`${item.dateKey}::${item.title}`, item]));

  rows.forEach((row) => {
    const dayWord = row.find((w) => /^\d{1,2}$/.test(String(w.text).trim()) && Number(w.text) <= 31);
    if (!dayWord) return;
    const day = Number(dayWord.text);
    const titles = row
      .filter((w) => w !== dayWord)
      .map((w) => String(w.text || "").trim())
      .filter(isProcessTitle);
    titles.forEach((title) => pushItem(map, toDateKey(year, month, day), title));
  });

  const items = [...map.values()].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  return { items, month, year, method: items.length ? "word_rows" : "none" };
}

function clusterWordsByRow(words, threshold = 14) {
  const sorted = [...words].sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);
  const rows = [];
  sorted.forEach((word) => {
    const last = rows[rows.length - 1];
    if (!last) {
      rows.push([word]);
      return;
    }
    const ref = last[0];
    if (Math.abs(word.bbox.y0 - ref.bbox.y0) <= threshold) {
      last.push(word);
    } else {
      rows.push([word]);
    }
  });
  return rows.map((row) => row.sort((a, b) => a.bbox.x0 - b.bbox.x0));
}

export function generatePersonalDraftsFromTable(items, defaults = {}) {
  return (Array.isArray(items) ? items : [])
    .map((item) =>
      createScheduleOcrDraft({
        dateKey: item.dateKey,
        title: item.title,
        startTime: defaults.startTime,
        endTime: defaults.endTime,
        color: defaults.color || "blue",
        memo: defaults.memo || "",
      })
    )
    .filter(Boolean);
}
