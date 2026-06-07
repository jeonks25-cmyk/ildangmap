/**
 * 일정 붙여넣기/OCR import 파서
 *
 * 현재: 카톡·문자·밴드·네이버카페 공지 텍스트
 * OCR 결과 텍스트도 동일 `parseScheduleImport` 파이프라인으로 연결
 */

import { SCHEDULE_DEFAULT_END_TIME, SCHEDULE_DEFAULT_START_TIME } from "../constants/scheduleDefaults";

export const SCHEDULE_IMPORT_SOURCE = {
  PASTE: "paste",
  OCR: "ocr",
};

const TIME_RANGE_RE = /(\d{1,2}:\d{2})\s*[~\-–—]\s*(\d{1,2}:\d{2})/;
const TIME_SINGLE_RE = /(?:^|\s)(\d{1,2}:\d{2})(?:\s|$)/;

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

/** 한 줄에서 날짜와 나머지(제목 후보) 추출 */
function extractDateFromLine(line, referenceDate) {
  const text = String(line || "").trim();
  if (!text) return null;

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

function isLikelyMetaLine(line) {
  return /(기공|반장|명|인원|인원수|모집|출근|현장|연락|문의|카톡|문자|밴드|카페|필요|구함)/.test(line);
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

  let dateKey = null;
  let startTime = null;
  let endTime = null;
  let title = null;
  const memoLines = [];
  const titleCandidates = [];

  lines.forEach((line) => {
    const timeResult = extractTimeFromLine(line);
    if (timeResult) {
      if (!startTime && timeResult.startTime) startTime = timeResult.startTime;
      if (!endTime && timeResult.endTime) endTime = timeResult.endTime;
      if (timeResult.remainder) titleCandidates.push(timeResult.remainder);
      if (!timeResult.remainder && line.match(TIME_RANGE_RE)) return;
    }

    const dateResult = extractDateFromLine(line, referenceDate);
    if (dateResult?.dateKey) {
      dateKey = dateKey || dateResult.dateKey;
      if (dateResult.remainder) titleCandidates.push(dateResult.remainder);
      return;
    }

    if (timeResult && !timeResult.remainder) return;

    if (isLikelyMetaLine(line)) {
      memoLines.push(line);
      return;
    }

    titleCandidates.push(line);
  });

  title = titleCandidates.find((candidate) => candidate && !TIME_RANGE_RE.test(candidate)) || null;

  if (!title && memoLines.length) {
    const promoted = memoLines.find((line) => !isLikelyMetaLine(line) || /동|필름|타일|도장|아파트|오피스|현장/.test(line));
    if (promoted) {
      title = promoted;
      const idx = memoLines.indexOf(promoted);
      if (idx >= 0) memoLines.splice(idx, 1);
    }
  }

  const filledFields = [];
  const warnings = [];

  if (title) filledFields.push("title");
  else warnings.push("제목을 찾지 못했습니다. 직접 입력해 주세요.");

  if (dateKey) filledFields.push("dateKey");
  else warnings.push("날짜를 찾지 못했습니다. 직접 선택해 주세요.");

  if (startTime) {
    filledFields.push("startTime");
  } else {
    startTime = SCHEDULE_DEFAULT_START_TIME;
    warnings.push(`시작 시간을 찾지 못해 기본값(${SCHEDULE_DEFAULT_START_TIME})을 넣었습니다.`);
  }

  if (endTime) {
    filledFields.push("endTime");
  } else {
    endTime = SCHEDULE_DEFAULT_END_TIME;
    warnings.push(`종료 시간을 찾지 못해 기본값(${SCHEDULE_DEFAULT_END_TIME})을 넣었습니다.`);
  }

  const ok = Boolean(title && dateKey && startTime && endTime);

  return {
    ok,
    title,
    dateKey,
    startTime,
    endTime,
    memo: memoLines.join("\n"),
    rawText,
    source,
    filledFields,
    warnings,
  };
}

/**
 * 붙여넣기·OCR 등 공통 import 진입점
 * @param {{ source?: string, text?: string }} input
 * @param {{ referenceDate?: Date }} [options]
 * @returns {ScheduleImportResult}
 */
export function parseScheduleImport(input, options = {}) {
  const source = input?.source || SCHEDULE_IMPORT_SOURCE.PASTE;
  const text = input?.text || "";
  return parseSchedulePasteText(text, { ...options, source });
}
