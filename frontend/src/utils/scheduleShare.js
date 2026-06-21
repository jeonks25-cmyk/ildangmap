import { getPublicAppOrigin } from "./inviteLink";
import { buildSmsHref } from "./inviteLink";
import { formatSchedulePeriodLabel } from "./workerAssignmentModel";
import { CRAFT_LABEL } from "./jobModel";

/** 추후 /schedule/share/:id 라우트 연동 시 true */
export const SCHEDULE_SHARE_INCLUDE_LINK = false;

export const SCHEDULE_SHARE_PATH_PREFIX = "/schedule/share";

export function buildScheduleShareUrl(scheduleId) {
  if (scheduleId == null || String(scheduleId).trim() === "") return null;
  return `${getPublicAppOrigin()}${SCHEDULE_SHARE_PATH_PREFIX}/${encodeURIComponent(String(scheduleId))}`;
}

function parseDateKey(dateKey) {
  const [y, m, d] = String(dateKey || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** 📅 6월 4일(수) */
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

function extractFieldScheduleMemo(schedule) {
  const chunks = [];
  if (schedule?.specialNote) chunks.push(String(schedule.specialNote).trim());
  if (schedule?.workDetails) chunks.push(String(schedule.workDetails).trim());
  if (Array.isArray(schedule?.summaryLines)) {
    schedule.summaryLines.forEach((line) => {
      const t = String(line || "").trim();
      if (t) chunks.push(t);
    });
  }
  return [...new Set(chunks)].join(" · ");
}

function resolveCrewLine(input, craft) {
  const craftLabel = CRAFT_LABEL[craft] || craft || "기공";
  const count = Number(input?.crewCount);
  if (Number.isFinite(count) && count > 0) return `${craftLabel} ${count}명`;
  const assignments = Array.isArray(input?.workerAssignments) ? input.workerAssignments : [];
  if (assignments.length) return `${craftLabel} ${assignments.length}명`;
  const invites = Array.isArray(input?.scheduleInvites) ? input.scheduleInvites : [];
  if (invites.length) return `${craftLabel} ${invites.length}명`;
  return "";
}

function resolveScheduleTitle(input) {
  const craftLabel = CRAFT_LABEL[input?.craft] || "";
  const site = String(input?.title || input?.siteLabel || "현장").trim();
  if (craftLabel && site && !site.includes(craftLabel)) return `${site} ${craftLabel}공사`;
  return site || "현장 일정";
}

/** field schedule · personal event · composer form · day entry 통합 */
export function normalizeScheduleShareInput(input, { inquiryContact = "" } = {}) {
  if (!input) {
    return {
      id: "",
      scheduleName: "일정",
      siteName: "—",
      dateLabel: "—",
      timeLabel: "—",
      crewLine: "",
      inquiryContact: String(inquiryContact || "").trim(),
      memo: "",
      address: "",
    };
  }

  if (input.kind === "personal" || input.personalEvent) {
    const ev = input.personalEvent || input;
    return {
      id: ev.id,
      scheduleName: String(ev.title || input.title || "개인 일정").trim(),
      siteName: "—",
      dateLabel: formatShareDateLabel(ev.dateKey || input.dateKey, input.endDateKey || ev.endDateKey),
      timeLabel: formatShareTimeLabel(ev.startTime || input.startTime, ev.endTime || input.endTime, input.time),
      crewLine: "",
      inquiryContact: String(inquiryContact || "").trim(),
      memo: String(ev.memo || input.memo || "").trim(),
      address: "",
    };
  }

  if (input.kind === "site" && input.schedule) {
    return normalizeScheduleShareInput(input.schedule, { inquiryContact });
  }

  if (input.workDate != null || input.workTime != null || input.craft != null) {
    const siteTitle = String(input.title || input.siteLabel || "현장").trim();
    const endKey = input.workDateEnd || input.endDate;
    return {
      id: input.id,
      scheduleName: resolveScheduleTitle(input),
      siteName: siteTitle,
      dateLabel: formatShareDateLabel(input.workDate, endKey) || formatSchedulePeriodLabel(input),
      timeLabel: formatShareTimeLabel(null, null, input.workTime),
      crewLine: resolveCrewLine(input, input.craft),
      inquiryContact: String(inquiryContact || input.inquiryContact || "").trim(),
      memo: extractFieldScheduleMemo(input),
      address: String(input.fullAddress || input.shortRegion || "").trim(),
    };
  }

  if (input.title && (input.workDateStart || input.dateKey)) {
    const isSite = input.entryType !== "personal";
    const siteTitle = String(input.title || "").trim();
    return {
      id: input.id,
      scheduleName: isSite ? resolveScheduleTitle({ title: siteTitle, craft: input.craft }) : siteTitle,
      siteName: isSite ? siteTitle : "—",
      dateLabel: formatShareDateLabel(input.workDateStart || input.dateKey, input.workDateEnd || input.endDateKey),
      timeLabel: formatShareTimeLabel(input.startTime, input.endTime),
      crewLine: isSite ? resolveCrewLine(input, input.craft) : "",
      inquiryContact: String(inquiryContact || "").trim(),
      memo: String(input.memo || "").trim(),
      address: "",
    };
  }

  return {
    id: input.id,
    scheduleName: String(input.scheduleName || input.title || "일정").trim(),
    siteName: String(input.siteName || input.title || "—").trim() || "—",
    dateLabel: String(input.dateLabel || "—").trim() || "—",
    timeLabel: formatShareTimeLabel(null, null, input.timeLabel || input.time),
    crewLine: String(input.crewLine || "").trim(),
    inquiryContact: String(inquiryContact || input.inquiryContact || "").trim(),
    memo: String(input.memo || "").trim(),
    address: String(input.address || "").trim(),
  };
}

export function buildScheduleShareMessage(fields, { includeLink = SCHEDULE_SHARE_INCLUDE_LINK, inquiryContact = "" } = {}) {
  const data = normalizeScheduleShareInput(fields, { inquiryContact });
  const url = includeLink && data.id ? buildScheduleShareUrl(data.id) : null;

  const lines = [
    "[일당맵]",
    "",
    data.scheduleName || "현장 일정",
    "",
    `📅 ${data.dateLabel || "—"}`,
    `⏰ ${data.timeLabel || "—"}`,
    "",
    `📍 ${data.address || data.siteName || "—"}`,
    "",
  ];

  if (data.crewLine) {
    lines.push(data.crewLine, "");
  }
  if (data.memo) {
    lines.push(data.memo, "");
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
    title: data.scheduleName || "현장 일정",
    fullText,
  };
}

/** Web Share API · SMS · 클립보드용 */
export function buildScheduleSharePayload(input, options = {}) {
  const message = buildScheduleShareMessage(input, options);
  return {
    title: message.title,
    text: message.fullText,
    fullText: message.fullText,
    url: message.url,
  };
}

export async function shareScheduleViaSystem(payload) {
  const body = payload?.fullText || payload?.text || "";
  const title = "[일당맵]";

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
