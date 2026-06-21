import { getPublicAppOrigin } from "./inviteLink";
import { buildSmsHref } from "./inviteLink";
import { formatSchedulePeriodLabel } from "./workerAssignmentModel";
import { CRAFT_LABEL } from "./jobModel";

/** 추후 /schedule/share/:id 라우트 연동 시 true */
export const SCHEDULE_SHARE_INCLUDE_LINK = false;

export const SCHEDULE_SHARE_PATH_PREFIX = "/schedule/share";

const INTERNAL_SHARE_PHRASES = [
  "연결된 현장 일정",
  "현장 필름 조공 현장",
  "현장 도배 조공 현장",
  "현장 타일 조공 현장",
];

const SENSITIVE_LINE_PATTERNS = [
  /공용\s*현관/u,
  /세대\s*비번/u,
  /세대비번/u,
  /세대\s*비밀/u,
  /출입\s*비밀/u,
  /출입비번/u,
  /출입\s*비번/u,
  /비밀번호/u,
  /access\s*password/i,
  /door\s*code/i,
  /현관\s*[:：]/u,
  /세대\s*[:：]/u,
];

const UNIT_IN_TEXT_RE = /(\d+\s*동\s*\d+\s*호|\d+\s*동|[Bb]\d+\s*-\s*\d+|\d+\s*호)/u;

export function buildScheduleShareUrl(scheduleId) {
  if (scheduleId == null || String(scheduleId).trim() === "") return null;
  return `${getPublicAppOrigin()}${SCHEDULE_SHARE_PATH_PREFIX}/${encodeURIComponent(String(scheduleId))}`;
}

function parseDateKey(dateKey) {
  const [y, m, d] = String(dateKey || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** 📅 6월 22일(월) */
export function formatShareDateLabel(dateKey, endDateKey) {
  const start = parseDateKey(dateKey);
  if (!start) return "—";
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const fmt = (d) => `${d.getMonth() + 1}월 ${d.getDate()}일(${weekdays[d.getDay()]})`;
  const end = endDateKey && endDateKey !== dateKey ? parseDateKey(endDateKey) : null;
  if (end && end.getTime() !== start.getTime()) {
    return `${fmt(start)} ~ ${fmt(end)}`;
  }
  return fmt(start);
}

function formatShareTimeLabel(startTime, endTime, fallback) {
  const raw = String(fallback || "").trim();
  if (raw.includes("~")) {
    return raw.replace(/~/g, " ~ ").replace(/\s+/g, " ").trim();
  }
  const s = String(startTime || "").trim();
  const e = String(endTime || "").trim();
  if (s && e) return `${s} ~ ${e}`;
  return raw || "—";
}

export function isSiteScheduleShareable(input) {
  if (!input) return false;
  if (input.kind === "personal" || input.personalEvent) return false;
  if (input.entryType === "personal") return false;
  return true;
}

function isInternalSharePhrase(text) {
  const normalized = String(text || "").trim();
  if (!normalized) return true;
  return INTERNAL_SHARE_PHRASES.some((phrase) => normalized === phrase || normalized.includes(phrase));
}

function isSensitiveShareLine(line) {
  const text = String(line || "").trim();
  if (!text) return true;
  return SENSITIVE_LINE_PATTERNS.some((pattern) => pattern.test(text));
}

/** 공유 메시지에서 비밀번호·내부 문구 제거 */
export function sanitizeShareText(text) {
  return String(text || "")
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line && !isSensitiveShareLine(line) && !isInternalSharePhrase(line))
    .join("\n")
    .trim();
}

function normalizeUnitText(value) {
  return String(value || "")
    .replace(/(\d+)\s*동\s*(\d+)\s*호/u, "$1동 $2호")
    .replace(/(\d+)동(\d+)호/u, "$1동 $2호")
    .replace(/\s+/g, " ")
    .trim();
}

/** 현장명 · 동호수 분리 */
export function splitSiteNameAndUnit(title, address = "") {
  const rawTitle = String(title || "").trim();
  const rawAddress = String(address || "").trim();
  let unitLine = "";
  let siteName = rawTitle;

  const titleUnitMatch = rawTitle.match(/(\d+\s*동\s*\d+\s*호|\d+\s*동|[Bb]\d+\s*-\s*\d+)/u);
  if (titleUnitMatch) {
    unitLine = normalizeUnitText(titleUnitMatch[0]);
    siteName = rawTitle
      .replace(titleUnitMatch[0], "")
      .replace(/[,，·]\s*$/, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  if (!unitLine && rawAddress) {
    const addressUnitMatch = rawAddress.match(/(\d+\s*동\s*\d+\s*호|\d+\s*동|[Bb]\d+\s*-\s*\d+)/u);
    if (addressUnitMatch) unitLine = normalizeUnitText(addressUnitMatch[0]);
  }

  if (!siteName) {
    siteName = rawAddress.replace(UNIT_IN_TEXT_RE, "").replace(/[,，·]\s*$/, "").trim();
  }
  if (!siteName) siteName = rawTitle || "현장";

  siteName = sanitizeShareText(siteName) || "현장";
  return { siteName, unitLine };
}

function resolveCraftWorkLine(craft) {
  const craftLabel = CRAFT_LABEL[craft] || "";
  if (!craftLabel) return "";
  return `${craftLabel} 작업`;
}

const CRAFT_TAIL_RE = /\s+(?:필름|도배|타일|전기|설비|페인트|조공|기공)(?:\s*\d+\s*명?|\s*공사|\s*현장)?\s*$/u;

function extractShareableMemo(input, includeMemo) {
  if (!includeMemo) return "";
  const chunks = [
    input?.calendarMemo,
    input?.memo,
    input?.specialNote,
    input?.workDetails,
    ...(Array.isArray(input?.summaryLines) ? input.summaryLines : []),
  ]
    .map((value) => sanitizeShareText(String(value || "")))
    .filter(Boolean);
  return [...new Set(chunks)].join("\n").trim();
}

function cleanSiteTitle(title, siteLabel) {
  const raw = String(title || siteLabel || "").trim();
  if (!raw || isInternalSharePhrase(raw)) return "";
  return sanitizeShareText(raw.replace(CRAFT_TAIL_RE, "").trim()) || "";
}

function resolveShareTitle(source) {
  const candidates = [source?.title, source?.siteLabel, source?.fieldTitle].map((value) =>
    cleanSiteTitle(String(value || "").trim())
  );
  return candidates.find((value) => value && value !== "현장") || candidates.find(Boolean) || "";
}

/** field schedule · composer form · day entry 통합 (현장 일정만) */
export function normalizeScheduleShareInput(input, { inquiryContact = "", includeMemo = false } = {}) {
  if (!input || !isSiteScheduleShareable(input)) {
    return null;
  }

  if (input.kind === "site" && input.schedule) {
    return normalizeScheduleShareInput(
      {
        ...input.schedule,
        memo: input.memo,
        calendarMemo: input.schedule.calendarMemo || input.memo,
      },
      { inquiryContact, includeMemo }
    );
  }

  let source = input;
  if (input.title && (input.workDateStart || input.dateKey) && input.entryType !== "personal") {
    source = {
      id: input.id,
      title: input.title,
      craft: input.craft,
      workDate: input.workDateStart || input.dateKey,
      workDateEnd: input.workDateEnd || input.endDateKey,
      workTime: `${input.startTime || ""}~${input.endTime || ""}`,
      calendarMemo: input.memo,
      memo: input.memo,
    };
  }

  const title = resolveShareTitle(source);
  const address = String(source.fullAddress || source.shortRegion || source.address || "").trim();
  const { siteName, unitLine } = splitSiteNameAndUnit(title, address);
  const endKey = source.workDateEnd || source.endDate || source.endDateKey;
  const craftWorkLine = resolveCraftWorkLine(source.craft);

  return {
    id: source.id,
    siteName,
    unitLine,
    dateLabel: formatShareDateLabel(source.workDate || source.workDateStart || source.dateKey, endKey) || formatSchedulePeriodLabel(source),
    timeLabel: formatShareTimeLabel(source.startTime, source.endTime, source.workTime || source.time),
    craftWorkLine,
    inquiryContact: String(inquiryContact || source.inquiryContact || "").trim(),
    memo: extractShareableMemo(source, includeMemo),
  };
}

export function buildScheduleShareMessage(fields, { includeLink = SCHEDULE_SHARE_INCLUDE_LINK, inquiryContact = "", includeMemo = false } = {}) {
  const data = normalizeScheduleShareInput(fields, { inquiryContact, includeMemo });
  if (!data) return null;

  const url = includeLink && data.id ? buildScheduleShareUrl(data.id) : null;
  const lines = ["[일당맵 현장 일정]", "", `📍 ${data.siteName || "현장"}`];

  if (data.unitLine) {
    lines.push(`🏢 ${data.unitLine}`);
  }

  lines.push("", `📅 ${data.dateLabel || "—"}`, `⏰ ${data.timeLabel || "—"}`, "");

  if (data.craftWorkLine) {
    lines.push(`👷 ${data.craftWorkLine}`, "");
  }

  if (data.memo) {
    lines.push("메모", data.memo, "");
  }

  if (data.inquiryContact) {
    lines.push(`문의: ${data.inquiryContact}`);
  }

  if (url) {
    lines.push("", url);
  }

  const fullText = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();

  return {
    ...data,
    url,
    title: "[일당맵 현장 일정]",
    fullText,
  };
}

/** Web Share API · SMS · 클립보드용 */
export function buildScheduleSharePayload(input, options = {}) {
  const message = buildScheduleShareMessage(input, options);
  if (!message) return null;
  return {
    title: message.title,
    text: message.fullText,
    fullText: message.fullText,
    url: message.url,
  };
}

export async function shareScheduleViaSystem(payload) {
  const body = payload?.fullText || payload?.text || "";
  const title = payload?.title || "[일당맵 현장 일정]";

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      const shareData = payload?.url
        ? { title, text: body.replace(`\n\n${payload.url}`, ""), url: payload.url }
        : { title, text: body };
      await navigator.share(shareData);
      return { ok: true, method: "share" };
    } catch (error) {
      if (error?.name === "AbortError") return { ok: false, cancelled: true };
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(body);
    return { ok: true, method: "clipboard" };
  }
  return { ok: false };
}

export function openScheduleShareSms(payload, phone) {
  const body = payload?.fullText || payload?.text || "";
  window.location.href = buildSmsHref({ phone, body });
  return { ok: true, method: "sms" };
}

export async function copyScheduleSharePayload(payload) {
  const body = payload?.fullText || payload?.text || "";
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(body);
    return { ok: true };
  }
  return { ok: false };
}
