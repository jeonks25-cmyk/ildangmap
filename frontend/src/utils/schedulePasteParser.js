/**
 * 일정 붙여넣기/OCR import 파서
 *
 * 현장 카톡 공지: 제목(현장명+동·호) · 날짜(없으면 내일) · 나머지→메모
 */

import { parseSiteFields, isNoiseLine, buildSiteTitle, pickPlausibleApartmentName } from "../features/site-import/parser/siteFieldParser";
import {
  extractExplicitWorkTimes,
  isKakaoSendTimeLine,
  isExplicitWorkTimeLine,
} from "../features/site-import/parser/workTimeExtractor";
import {
  recordStructureAttempt,
  isStructureDebugEnabled,
} from "../features/site-import/parser/siteImportStructureMetrics";
import { extractSiteInfo } from "../features/site-import/extractor/siteInfoExtractor";
import {
  logScheduleStructurePipeline,
  explainGarbageTitle,
} from "../features/site-import/parser/siteImportDiag";

export const SCHEDULE_IMPORT_SOURCE = {
  PASTE: "paste",
  OCR: "ocr",
};

const TIME_RANGE_RE = /(\d{1,2}:\d{2})\s*[~\-–—]\s*(\d{1,2}:\d{2})/;
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

  const weekdayMatch = text.match(/^(월|화|수|목|금|토|일)요일(?:\s+(.+))?$/u);
  if (weekdayMatch) {
    const weekdayMap = { 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6, 일: 0 };
    const target = weekdayMap[weekdayMatch[1]];
    const ref = referenceDate instanceof Date ? referenceDate : new Date();
    const current = ref.getDay();
    let diff = target - current;
    if (diff <= 0) diff += 7;
    return {
      dateKey: addDays(ref, diff),
      remainder: (weekdayMatch[2] || "").trim(),
    };
  }

  const inlineWeekday = text.match(/^(월|화|수|목|금|토|일)요일\s+(.+)$/u);
  if (inlineWeekday) {
    const weekdayMap = { 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6, 일: 0 };
    const target = weekdayMap[inlineWeekday[1]];
    const ref = referenceDate instanceof Date ? referenceDate : new Date();
    const current = ref.getDay();
    let diff = target - current;
    if (diff <= 0) diff += 7;
    return {
      dateKey: addDays(ref, diff),
      remainder: inlineWeekday[2].trim(),
    };
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
  if (isKakaoSendTimeLine(text)) return null;
  const explicit = extractExplicitWorkTimes(text);
  if (!explicit.extracted) return null;
  return {
    startTime: explicit.startTime,
    endTime: explicit.endTime,
    remainder: text
      .replace(TIME_RANGE_RE, "")
      .replace(/(\d{1,2}:\d{2})\s*(?:시작|출근|입장|도착|합류|부터)/u, "")
      .trim(),
  };
}

function isPureTimeLine(line) {
  if (isKakaoSendTimeLine(line)) return true;
  return isExplicitWorkTimeLine(line);
}

function isPureDateLine(line, referenceDate) {
  const result = extractDateFromLine(line, referenceDate);
  return Boolean(result?.dateKey && !result.remainder);
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

const TITLE_EXCLUDE_RES = [
  /^KT/i,
  /^SKT/i,
  /^LG\s*U\+?/i,
  /^PASS$/i,
  /^오전$/u,
  /^오후$/u,
  /^\d{1,2}:\d{2}$/,
  /^-?\d{1,3}$/,
  /^\d+$/,
  /^우리$/u,
  /^계좌$/u,
  /1002266934100/,
  /^\d{4}년/u,
  /^(월|화|수|목|금|토|일)요일$/u,
];

/** 제목 후보에서 무조건 제외 */
export function isExcludedTitleCandidate(value) {
  const t = String(value || "").trim();
  if (!t) return true;

  for (const re of TITLE_EXCLUDE_RES) {
    if (re.test(t)) return true;
  }

  if (/^[\W\d\s:»]{1,24}$/.test(t) && !/[가-힣]{2,}/u.test(t)) return true;
  if (/KT\d|@\d{3,}/.test(t) && !/\d{3,4}\s*동/u.test(t)) return true;
  const hangul = (t.match(/[가-힣]/g) || []).length;
  const latin = (t.match(/[A-Za-z]/g) || []).length;
  if (hangul > 0 && latin > hangul && !/\d{3,4}\s*동/u.test(t)) return true;
  if (/Md&@p|»/.test(t) && !/[가-힣]{2,}/u.test(t)) return true;

  return false;
}

function logTitleResolution({
  titlePath,
  titleBefore,
  apartmentName,
  building,
  unit,
  finalTitle,
}) {
  console.log("[SCHEDULE-OCR] 제목 생성 직전:", {
    titlePath,
    titleBefore,
    apartmentName,
    building,
    unit,
    finalTitle,
  });

  if (building && unit && finalTitle && !/\d{3,4}\s*동\s*\d{2,4}\s*호/u.test(finalTitle)) {
    console.error("[BUG] title priority broken", {
      titlePath,
      apartmentName,
      building,
      unit,
      finalTitle,
    });
  }
}

/**
 * 제목 우선순위:
 * 1) building+unit → 동·호 제목 (아파트명 optional)
 * 2) apartmentName만
 * 3) OCR 자유 텍스트 줄
 * 4) legacy fallback
 */
function resolveScheduleTitle({
  apartmentName,
  siteNameCandidates = [],
  building,
  unit,
  lines,
  referenceDate,
  titleDiag,
}) {
  const apt = pickPlausibleApartmentName(apartmentName, siteNameCandidates);
  const b = String(building || "").trim();
  const u = String(unit || "").trim();
  let title = "";
  let titlePath = null;
  let titleLineIndex = -1;
  let titleRemainder = "";
  const titleBefore = "";

  if (b && u) {
    titlePath = apt ? "priority1_dong_ho_with_name" : "priority1_dong_ho_only";
    const resolvedTitle = buildSiteTitle({ siteName: apt, building: b, unit: u });
    title = resolvedTitle;
    titleLineIndex = lines.findIndex((line) => {
      const compact = String(line || "").replace(/\s+/g, "");
      return compact.includes(`${b}동`) && (compact.includes(`${u}호`) || compact.includes(u));
    });
    titleDiag.steps.push({ step: titlePath, apartmentName: apt, building: b, unit: u, title, titleLineIndex });
    logTitleResolution({ titlePath, titleBefore, apartmentName: apt, building: b, unit: u, finalTitle: title });
    console.log("[SCHEDULE-OCR] resolveScheduleTitle finalTitle:", title);
    return {
      title,
      resolvedTitle,
      parsedTitle: "",
      legacyTitle: "",
      titlePath,
      titleLineIndex,
      titleRemainder,
    };
  }

  if (apt && apt.length >= 2 && !isExcludedTitleCandidate(apt)) {
    titlePath = "priority2_apartment_name";
    title = apt;
    titleDiag.steps.push({ step: titlePath, apartmentName: apt, title });
    logTitleResolution({ titlePath, titleBefore, apartmentName: apt, building: b, unit: u, finalTitle: title });
    console.log("[SCHEDULE-OCR] resolveScheduleTitle finalTitle:", title);
    return {
      title,
      resolvedTitle: "",
      parsedTitle: apt,
      legacyTitle: "",
      titlePath,
      titleLineIndex,
      titleRemainder,
    };
  }

  for (let i = 0; i < Math.min(lines.length, 12); i++) {
    if (isNoiseLine(lines[i])) {
      titleDiag.steps.push({ step: "skip_noise_line", lineIndex: i, line: lines[i] });
      continue;
    }
    const candidate = stripDateAndTimeFromLine(lines[i], referenceDate);
    titleDiag.steps.push({ step: "try_ocr_line", lineIndex: i, line: lines[i], candidate });
    if (!candidate || isExcludedTitleCandidate(candidate)) continue;

    const extracted = extractSiteTitleFromLine(candidate);
    const ocrTitle = String(extracted.title || "").trim();
    if (!ocrTitle || isExcludedTitleCandidate(ocrTitle)) continue;

    titlePath = "priority3_ocr_free_text";
    title = ocrTitle;
    titleRemainder = extracted.titleRemainder || "";
    titleLineIndex = i;
    titleDiag.titleSourceLine = i;
    titleDiag.titleSourceText = candidate;
    titleDiag.steps.push({ step: titlePath, lineIndex: i, candidate, title, titleRemainder });
    logTitleResolution({ titlePath, titleBefore, apartmentName: apt, building: b, unit: u, finalTitle: title });
    console.log("[SCHEDULE-OCR] resolveScheduleTitle finalTitle:", title);
    return {
      title,
      resolvedTitle: "",
      parsedTitle: title,
      legacyTitle: "",
      titlePath,
      titleLineIndex,
      titleRemainder,
    };
  }

  titlePath = "priority4_legacy_fallback";
  titleLineIndex = -1;
  let titleSource = "";

  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    if (isNoiseLine(lines[i])) continue;
    const candidate = stripDateAndTimeFromLine(lines[i], referenceDate);
    if (candidate && !isExcludedTitleCandidate(candidate)) {
      titleLineIndex = i;
      titleSource = candidate;
      break;
    }
  }

  if (!titleSource) {
    titleDiag.steps.push({ step: "no_valid_title_line" });
    logTitleResolution({ titlePath, titleBefore, apartmentName: apt, building: b, unit: u, finalTitle: "" });
    console.log("[SCHEDULE-OCR] resolveScheduleTitle finalTitle:", "");
    return {
      title: "",
      resolvedTitle: "",
      parsedTitle: "",
      legacyTitle: "",
      titlePath,
      titleLineIndex,
      titleRemainder: "",
    };
  }

  titleDiag.titleSourceLine = titleLineIndex;
  titleDiag.titleSourceText = titleSource;
  const extracted = extractSiteTitleFromLine(titleSource);
  titleDiag.steps.push({ step: "extractSiteTitleFromLine", input: titleSource, output: extracted });
  ({ title, titleRemainder } = extracted);

  if (isExcludedTitleCandidate(title)) {
    titleDiag.garbageRejected = true;
    titleDiag.rejectedTitle = title;
    titleDiag.garbageReason = explainGarbageTitle(title, titleLineIndex, titleSource);
    titleDiag.steps.push({
      step: "garbage_title_rejected",
      rejectedTitle: title,
      reason: titleDiag.garbageReason,
    });
    title = "";
    titleRemainder = titleSource || "";
  }

  logTitleResolution({ titlePath, titleBefore, apartmentName: apt, building: b, unit: u, finalTitle: title });
  console.log("[SCHEDULE-OCR] resolveScheduleTitle finalTitle:", title);
  return {
    title,
    resolvedTitle: "",
    parsedTitle: "",
    legacyTitle: title,
    titlePath,
    titleLineIndex,
    titleRemainder,
  };
}

function isSiteInfoLine(line, fieldParse) {
  if (!fieldParse?.building || !fieldParse?.unit) return false;
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
  const siteInfoSnap = extractSiteInfo(rawText);
  const apartmentName = pickPlausibleApartmentName(
    fieldParse.siteName,
    fieldParse.siteNameCandidates,
    siteInfoSnap?.apartmentName
  );
  const building = fieldParse.building || siteInfoSnap?.building || "";
  const unit = fieldParse.unit || siteInfoSnap?.unit || "";
  const structureOk = Boolean(fieldParse.structureOk || (building && unit));

  const timeParse = extractExplicitWorkTimes(rawText);
  const metricsSession = recordStructureAttempt({
    rawText,
    source,
    parsed: {
      siteName: fieldParse.siteName,
      building: fieldParse.building,
      unit: fieldParse.unit,
      structureOk,
    },
  });

  let dateKey = null;
  let startTime = null;
  let endTime = null;
  let dateFromText = false;
  let timeExtracted = false;

  lines.forEach((line) => {
    if (!dateKey) {
      const dateResult = extractDateFromLine(line, referenceDate);
      if (dateResult?.dateKey) {
        dateKey = dateResult.dateKey;
        dateFromText = true;
      }
    }
  });

  if (timeParse.extracted) {
    startTime = timeParse.startTime;
    endTime = timeParse.endTime;
    timeExtracted = true;
  }

  if (!dateKey) {
    dateKey = getDefaultImportDateKey(referenceDate);
  }

  let title = "";
  let titleRemainder = "";
  let titleLineIndex = -1;
  const titleDiag = { path: null, steps: [] };

  const titleResolved = resolveScheduleTitle({
    apartmentName,
    siteNameCandidates: fieldParse.siteNameCandidates || [],
    building,
    unit,
    lines,
    referenceDate,
    titleDiag,
  });
  title = titleResolved.title;
  titleRemainder = titleResolved.titleRemainder;
  titleLineIndex = titleResolved.titleLineIndex;
  titleDiag.path = titleResolved.titlePath;
  const resolvedTitle = titleResolved.resolvedTitle || "";
  const parsedTitle = titleResolved.parsedTitle || "";
  const legacyTitle = titleResolved.legacyTitle || "";

  const mergedUnitLineIndexes = new Set();
  if (title && !hasUnitInTitle(title) && !(building && unit)) {
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

  const filledFields = ["dateKey"];
  const warnings = [];

  if (timeExtracted) {
    filledFields.push("startTime", "endTime");
  }

  if (title) {
    filledFields.push("title");
  } else {
    warnings.push("제목을 찾지 못했습니다. 직접 입력해 주세요.");
  }
  if (structureOk) {
    filledFields.push("structureOk");
  }
  if (dateFromText) filledFields.push("dateDetected");
  if (memoLines.length) filledFields.push("memo");

  const passwordMemo = [];
  if (siteInfoSnap?.commonPassword) passwordMemo.push(`공동비밀번호: ${siteInfoSnap.commonPassword}`);
  if (siteInfoSnap?.housePassword) passwordMemo.push(`세대비밀번호: ${siteInfoSnap.housePassword}`);
  const memoWithPasswords = [memoLines.join("\n"), passwordMemo.join("\n")].filter(Boolean).join("\n");

  const ok = Boolean((title || dateKey) && dateKey);

  const preTitle = {
    apartmentName,
    building,
    unit,
    commonPassword: siteInfoSnap?.commonPassword || "",
    housePassword: siteInfoSnap?.housePassword || "",
    confidence: siteInfoSnap?.confidence ?? null,
  };

  logScheduleStructurePipeline({
    source,
    ocrRawText: options.ocrRawText || rawText,
    ocrFilteredText: rawText,
    structureInput: rawText,
    fieldParse,
    siteInfo: siteInfoSnap,
    preTitle,
    titleDiag,
    finalTitle: title || null,
    dateKey,
    timeExtracted,
    startTime,
    endTime,
    ok,
    warnings,
  });

  return {
    ok,
    title: title || null,
    finalTitle: title || null,
    resolvedTitle: resolvedTitle || null,
    parsedTitle: parsedTitle || null,
    legacyTitle: legacyTitle || null,
    resolvedTitleSource: building && unit ? { apartmentName, building, unit } : null,
    dateKey,
    startTime,
    endTime,
    memo: memoWithPasswords || memoLines.join("\n"),
    rawText,
    source,
    filledFields,
    warnings,
    structureOk,
    structureTrace: {
      ...fieldParse,
      siteName: apartmentName,
      building,
      unit,
      structureOk,
      commonPassword: siteInfoSnap?.commonPassword || "",
      housePassword: siteInfoSnap?.housePassword || "",
      workItems: siteInfoSnap?.workItems || [],
      craft: siteInfoSnap?.craft || "",
      timeCandidates: timeParse.candidates,
      timeExtracted,
      timeFinal: timeExtracted ? { startTime, endTime } : null,
    },
    timeExtracted,
    metricsSessionId: metricsSession.id,
    structureMetrics: {
      siteName: apartmentName,
      building,
      unit,
    },
    titleDiag,
    parseDiagnostics: {
      titlePath: titleDiag.path,
      garbageRejected: Boolean(titleDiag.garbageRejected),
      rejectedTitle: titleDiag.rejectedTitle || null,
    },
  };
}

/**
 * 붙여넣기·OCR 등 공통 import 진입점
 */
export function parseScheduleImport(input, options = {}) {
  const source = input?.source || SCHEDULE_IMPORT_SOURCE.PASTE;
  const text = input?.text || "";
  return parseSchedulePasteText(text, {
    ...options,
    source,
    ocrRawText: input?.ocrRawText || options.ocrRawText,
  });
}
