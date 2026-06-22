/**
 * 일정 붙여넣기/OCR import 파서
 *
 * 현장 카톡 공지: 제목(현장명+동·호) · 날짜(없으면 내일) · 나머지→메모
 */

import { SCHEDULE_DEFAULT_END_TIME, SCHEDULE_DEFAULT_START_TIME } from "../constants/scheduleDefaults";
import { parseSiteFields, isNoiseLine } from "../features/site-import/parser/siteFieldParser";
import {
  recordStructureAttempt,
  isStructureDebugEnabled,
} from "../features/site-import/parser/siteImportStructureMetrics";

export const SCHEDULE_IMPORT_SOURCE = {
  PASTE: "paste",
  OCR: "ocr",
};

const TIME_RANGE_RE = /(\d{1,2}:\d{2})\s*[~\-–—]\s*(\d{1,2}:\d{2})/;
const TIME_SINGLE_RE = /(?:^|\s)(\d{1,2}:\d{2})(?:\s|$)/;
const CRAFT_TAIL_RE = /\s+(?:필름|도배|타일|전기|설비|페인트|기타)(?:\s*\d+\s*명?|\s*공사)?\s*$/u;

/** 세대 표기 — 긴 패턴 우선 */
const UNIT_PATTERNS = [
  /\d+\s*동\s*\d+\s*호/u,
  /[Bb]\d+\s*-\s*\d+/u,
  /\d+\s*동/u,
  /\d+\s*호/u,
];

const STANDALONE_UNIT_LINE_RE = /^(\d+\s*동(?:\s*\d+\s*호)?|[Bb]\d+\s*-\s*\d+|\d+\s*호)\.?$/u;

function pad2(value) {
  return String(value).padStart(2, "0");
}

function normalizeTime(value) {
  const match = String(value || "").match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));
  return `${pad2(hour)}:${pad2(minute)}`;
}

function toDateKey(year, month, day) {
  if (!year || !month || !day) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function resolveYear(month, day, referenceDate) {
  const ref = referenceDate instanceof Date ? referenceDate : new Date();
  let year = ref.getFullYear();
  const candidate = new Date(year, month - 1, day);
  const todayStart = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  if (candidate < todayStart - 7 * 86400000) {
    year += 1;
  }
  return year;
}

function addDays(referenceDate, days) {
  const ref = referenceDate instanceof Date ? referenceDate : new Date();
  const next = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + days);
  return toDateKey(next.getFullYear(), next.getMonth() + 1, next.getDate());
}

/** 내일 날짜 (기본값) */
export function getDefaultImportDateKey(referenceDate = new Date()) {
  return addDays(referenceDate, 1);
}

/** 한 줄에서 날짜와 나머지(제목 후보) 추출 */
function extractDateFromLine(line, referenceDate) {
  const text = String(line || "").trim();
  if (!text) return null;

  if (/^내일$/u.test(text) || /\b내일\b/u.test(text)) {
    return { dateKey: addDays(referenceDate, 1), remainder: text.replace(/내일/u, "").trim() };
  }
  if (/^모레$/u.test(text) || /\b모레\b/u.test(text)) {
    return { dateKey: addDays(referenceDate, 2), remainder: text.replace(/모레/u, "").trim() };
  }

  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s*(.*)$/);
  if (match) {
    return {
      dateKey: toDateKey(Number(match[1]), Number(match[2]), Number(match[3])),
      remainder: match[4].trim(),
    };
  }

  match = text.match(/^(\d{1,2})\s*월\s*(\d{1,2})\s*일\s*(.*)$/);
  if (match) {
    const year = resolveYear(Number(match[1]), Number(match[2]), referenceDate);
    return {
      dateKey: toDateKey(year, Number(match[1]), Number(match[2])),
      remainder: match[3].trim(),
    };
  }

  match = text.match(/^(\d{1,2})월(\d{1,2})일\s*(.*)$/);
  if (match) {
    const year = resolveYear(Number(match[1]), Number(match[2]), referenceDate);
    return {
      dateKey: toDateKey(year, Number(match[1]), Number(match[2])),
      remainder: match[3].trim(),
    };
  }

  match = text.match(/^(\d{1,2})[/.-](\d{1,2})\s+(.+)$/);
  if (match) {
    const year = resolveYear(Number(match[1]), Number(match[2]), referenceDate);
    return {
      dateKey: toDateKey(year, Number(match[1]), Number(match[2])),
      remainder: match[3].trim(),
    };
  }

  match = text.match(/^(\d{1,2})[/.-](\d{1,2})$/);
  if (match) {
    const year = resolveYear(Number(match[1]), Number(match[2]), referenceDate);
    return {
      dateKey: toDateKey(year, Number(match[1]), Number(match[2])),
      remainder: "",
    };
  }

  match = text.match(/(\d{1,2})[/.-](\d{1,2})/);
  if (match) {
    const year = resolveYear(Number(match[1]), Number(match[2]), referenceDate);
    const remainder = text.replace(match[0], " ").replace(/\s+/g, " ").trim();
    return {
      dateKey: toDateKey(year, Number(match[1]), Number(match[2])),
      remainder,
    };
  }

  match = text.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (match) {
    const year = resolveYear(Number(match[1]), Number(match[2]), referenceDate);
    const remainder = text.replace(match[0], " ").replace(/\s+/g, " ").trim();
    return {
      dateKey: toDateKey(year, Number(match[1]), Number(match[2])),
      remainder,
    };
  }

  match = text.match(/(\d{1,2})월(\d{1,2})일/);
  if (match) {
    const year = resolveYear(Number(match[1]), Number(match[2]), referenceDate);
    const remainder = text.replace(match[0], " ").replace(/\s+/g, " ").trim();
    return {
      dateKey: toDateKey(year, Number(match[1]), Number(match[2])),
      remainder,
    };
  }

  return null;
}

function extractTimeFromLine(line) {
  const text = String(line || "").trim();
  const range = text.match(TIME_RANGE_RE);
  if (range) {
    return {
      startTime: normalizeTime(range[1]),
      endTime: normalizeTime(range[2]),
      remainder: text.replace(TIME_RANGE_RE, "").trim(),
    };
  }
  const single = text.match(TIME_SINGLE_RE);
  if (single && text.replace(single[0], "").trim().length <= 2) {
    return {
      startTime: normalizeTime(single[1]),
      endTime: null,
      remainder: "",
    };
  }
  return null;
}

function isPureDateLine(line, referenceDate) {
  const result = extractDateFromLine(line, referenceDate);
  return Boolean(result?.dateKey && !result.remainder);
}

function isPureTimeLine(line) {
  const result = extractTimeFromLine(line);
  return Boolean(result && (result.startTime || result.endTime) && !result.remainder);
}

/** 날짜·시간 토큰 제거 후 제목 후보 텍스트 */
function stripDateAndTimeFromLine(line, referenceDate) {
  let text = String(line || "").trim();
  if (!text) return "";

  const dateResult = extractDateFromLine(text, referenceDate);
  if (dateResult?.dateKey) {
    text = dateResult.remainder || "";
  }

  const timeResult = extractTimeFromLine(text);
  if (timeResult) {
    text = timeResult.remainder || "";
  }

  return text.trim();
}

function normalizeTitleText(text) {
  return String(text || "")
    .replace(/,\s*/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[.．…]+$/u, "")
    .trim();
}

function findUnitMatch(text) {
  let best = null;
  UNIT_PATTERNS.forEach((pattern) => {
    const match = text.match(pattern);
    if (!match || match.index == null) return;
    const end = match.index + match[0].length;
    if (!best || end > best.end) {
      best = { start: match.index, end, raw: match[0] };
    }
  });
  return best;
}

function hasUnitInTitle(title) {
  return Boolean(findUnitMatch(normalizeTitleText(title)));
}

function isStandaloneUnitLine(line) {
  return STANDALONE_UNIT_LINE_RE.test(String(line || "").trim());
}

function formatUnitToken(raw) {
  return String(raw || "")
    .replace(/\s+/g, " ")
    .replace(/(\d+)\s*동\s*(\d+)\s*호/u, "$1동 $2호")
    .replace(/(\d+)동(\d+)호/u, "$1동 $2호")
    .trim();
}

/**
 * 첫 줄에서 현장명 추출 — 동·호가 있으면 제목에 포함, 이후 텍스트는 메모
 */
export function extractSiteTitleFromLine(line) {
  let text = normalizeTitleText(line);
  if (!text) return { title: "", titleRemainder: "" };

  text = text.replace(CRAFT_TAIL_RE, "").trim();

  const unit = findUnitMatch(text);
  if (unit) {
    const title = normalizeTitleText(text.slice(0, unit.end));
    let titleRemainder = text.slice(unit.end).trim();
    titleRemainder = titleRemainder.replace(/^[,.:;·\s]+/u, "").trim();
    if (title) {
      return {
        title: formatUnitToken(title),
        titleRemainder,
      };
    }
  }

  return { title: text, titleRemainder: "" };
}

function isSiteInfoLine(line, fieldParse) {
  if (!fieldParse?.structureOk) return false;
  const compact = String(line || "").replace(/\s+/g, "");
  return compact.includes(`${fieldParse.building}동${fieldParse.unit}호`);
}

/**
 * @typedef {Object} ScheduleImportResult
 * @property {boolean} ok
 * @property {string|null} title
 * @property {string|null} dateKey
 * @property {string|null} startTime
 * @property {string|null} endTime
 * @property {string} memo
 * @property {string} rawText
 * @property {string} source
 * @property {string[]} filledFields
 * @property {string[]} warnings
 */

/**
 * @param {string} text
 * @param {{ referenceDate?: Date }} [options]
 * @returns {ScheduleImportResult}
 */
export function parseSchedulePasteText(text, options = {}) {
  const referenceDate = options.referenceDate instanceof Date ? options.referenceDate : new Date();
  const source = options.source || SCHEDULE_IMPORT_SOURCE.PASTE;
  const rawText = String(text || "").trim();
  const empty = {
    ok: false,
    title: null,
    dateKey: null,
    startTime: null,
    endTime: null,
    memo: "",
    rawText,
    source,
    filledFields: [],
    warnings: [],
  };

  if (!rawText) {
    return { ...empty, warnings: ["붙여넣을 내용이 없습니다."] };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const fieldParse = parseSiteFields(rawText, {
    label: "schedule-paste",
    debug: isStructureDebugEnabled(),
  });
  const metricsSession = recordStructureAttempt({
    rawText,
    source,
    parsed: {
      siteName: fieldParse.siteName,
      building: fieldParse.building,
      unit: fieldParse.unit,
      structureOk: fieldParse.structureOk,
    },
  });

  let dateKey = null;
  let startTime = null;
  let endTime = null;
  let dateFromText = false;

  lines.forEach((line) => {
    if (!dateKey) {
      const dateResult = extractDateFromLine(line, referenceDate);
      if (dateResult?.dateKey) {
        dateKey = dateResult.dateKey;
        dateFromText = true;
      }
    }
    const timeResult = extractTimeFromLine(line);
    if (timeResult) {
      if (!startTime && timeResult.startTime) startTime = timeResult.startTime;
      if (!endTime && timeResult.endTime) endTime = timeResult.endTime;
    }
  });

  if (!dateKey) {
    dateKey = getDefaultImportDateKey(referenceDate);
  }

  if (!startTime) startTime = SCHEDULE_DEFAULT_START_TIME;
  if (!endTime) endTime = SCHEDULE_DEFAULT_END_TIME;

  let title = "";
  let titleRemainder = "";
  let titleLineIndex = -1;

  if (fieldParse.structureOk) {
    title = fieldParse.final.title;
    titleLineIndex = lines.findIndex((line) => isSiteInfoLine(line, fieldParse));
    if (titleLineIndex < 0) {
      titleLineIndex = fieldParse.debug?.matches?.[0]?.lineIndex ?? 0;
    }
  } else {
    titleLineIndex = 0;
    let titleSource = stripDateAndTimeFromLine(lines[0], referenceDate);
    if ((!titleSource || isNoiseLine(lines[0])) && lines.length > 1) {
      for (let i = 0; i < Math.min(lines.length, 6); i++) {
        if (isNoiseLine(lines[i])) continue;
        const candidate = stripDateAndTimeFromLine(lines[i], referenceDate);
        if (candidate) {
          titleLineIndex = i;
          titleSource = candidate;
          break;
        }
      }
    }
    ({ title, titleRemainder } = extractSiteTitleFromLine(titleSource));
  }

  const mergedUnitLineIndexes = new Set();
  if (title && !hasUnitInTitle(title)) {
    const nextIndex = titleLineIndex + 1;
    const nextLine = lines[nextIndex];
    if (nextLine && isStandaloneUnitLine(nextLine)) {
      title = `${title} ${formatUnitToken(nextLine)}`.replace(/\s+/g, " ").trim();
      mergedUnitLineIndexes.add(nextIndex);
    }
  }

  const memoLines = [];
  if (titleRemainder) memoLines.push(titleRemainder);

  lines.forEach((line, index) => {
    if (index === titleLineIndex) return;
    if (mergedUnitLineIndexes.has(index)) return;
    if (isSiteInfoLine(line, fieldParse)) return;
    if (isNoiseLine(line)) return;
    if (isPureDateLine(line, referenceDate)) return;
    if (isPureTimeLine(line)) return;
    memoLines.push(line);
  });

  const filledFields = ["dateKey", "startTime", "endTime"];
  const warnings = [];

  if (title) {
    filledFields.push("title");
  } else {
    warnings.push("제목을 찾지 못했습니다. 직접 입력해 주세요.");
  }
  if (fieldParse.structureOk) filledFields.push("structureOk");
  if (dateFromText) filledFields.push("dateDetected");
  if (memoLines.length) filledFields.push("memo");

  const ok = Boolean(title && dateKey);

  return {
    ok,
    title: title || null,
    dateKey,
    startTime,
    endTime,
    memo: memoLines.join("\n"),
    rawText,
    source,
    filledFields,
    warnings,
    structureOk: fieldParse.structureOk,
    structureTrace: fieldParse,
    metricsSessionId: metricsSession.id,
    structureMetrics: {
      siteName: fieldParse.siteName,
      building: fieldParse.building,
      unit: fieldParse.unit,
    },
  };
}

/**
 * 붙여넣기·OCR 등 공통 import 진입점
 */
export function parseScheduleImport(input, options = {}) {
  const source = input?.source || SCHEDULE_IMPORT_SOURCE.PASTE;
  const text = input?.text || "";
  return parseSchedulePasteText(text, { ...options, source });
}
