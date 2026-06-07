import { SCHEDULE_DEFAULT_END_TIME, SCHEDULE_DEFAULT_START_TIME } from "../constants/scheduleDefaults";

/**
 * 통합 캘린더 이벤트 모델 — 외부 캘린더(Google/네이버/iOS) 연동 대비
 *
 * @typedef {'site'|'personal'} CalendarEventType
 * @typedef {'ildangmap'|'google'|'naver'|'ios'} CalendarEventSource
 *
 * @typedef {Object} CalendarEvent
 * @property {string} id
 * @property {CalendarEventType} type
 * @property {CalendarEventSource} source
 * @property {string} dateKey YYYY-MM-DD
 * @property {string} title
 * @property {string} [startTime] HH:mm
 * @property {string} [endTime] HH:mm
 * @property {string} [startAt] ISO8601 (연동용)
 * @property {string} [endAt] ISO8601 (연동용)
 * @property {string} [scheduleId]
 * @property {string} [jobId]
 * @property {string} [personalEventId]
 * @property {string} [externalId]
 * @property {number} [dayIndex] 0-based within multi-day site
 * @property {number} [totalDays]
 */

import { parseWorkTimeParts } from "./fieldSiteScheduleParser";
import { scheduleDateKeyFromWorkDate, toDateKey } from "./fieldScheduleModel";
import { getScheduleDateKeys } from "./scheduleModel";

export const CALENDAR_EVENT_TYPE = {
  SITE: "site",
  PERSONAL: "personal",
};

export const CALENDAR_EVENT_SOURCE = {
  ILDANGMAP: "ildangmap",
  GOOGLE: "google",
  NAVER: "naver",
  IOS: "ios",
};

function parseDateKeyParts(dateKey) {
  const m = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
}

export function buildIsoRange(dateKey, startTime = "08:00", endTime = "17:00") {
  const parts = parseDateKeyParts(dateKey);
  if (!parts) return { startAt: "", endAt: "" };
  const [sh, sm] = String(startTime || "08:00").split(":").map(Number);
  const [eh, em] = String(endTime || "17:00").split(":").map(Number);
  const start = new Date(parts.y, parts.mo - 1, parts.d, sh || 8, sm || 0, 0, 0);
  const end = new Date(parts.y, parts.mo - 1, parts.d, eh || 17, em || 0, 0, 0);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

/**
 * 현장 일정(schedule row) → 날짜별 site 이벤트 (기간 전체)
 */
export function buildSiteEventsFromSchedule(schedule) {
  if (!schedule) return [];
  const dateKeys = getScheduleDateKeys(schedule);
  if (!dateKeys.length) return [];

  const title = String(schedule.title || schedule.siteLabel || "현장").trim() || "현장";
  const { start, end } = parseWorkTimeParts(schedule.workTime || "08:00~17:00");
  const scheduleId = schedule.id != null ? String(schedule.id) : "";
  const jobId = schedule.jobId != null ? String(schedule.jobId) : "";

  return dateKeys.map((dateKey, dayIndex) => {
    const { startAt, endAt } = buildIsoRange(dateKey, start, end);
    return {
      id: `site:${scheduleId}:${dateKey}`,
      type: CALENDAR_EVENT_TYPE.SITE,
      source: CALENDAR_EVENT_SOURCE.ILDANGMAP,
      dateKey,
      title,
      startTime: start,
      endTime: end,
      startAt,
      endAt,
      scheduleId,
      jobId,
      dayIndex,
      totalDays: dateKeys.length,
    };
  });
}

/**
 * 현장 등록 직후(job) → 캘린더 이벤트 (schedule 생성 전 미리보기·동기화용)
 */
export function buildSiteEventsFromJob(job) {
  if (!job) return [];
  const workDate = scheduleDateKeyFromWorkDate(job.workDate || job.date);
  if (!workDate) return [];

  const endKey =
    scheduleDateKeyFromWorkDate(job.workDateEnd || job.endDate || job.workEndDate) || workDate;
  const duration =
    Number.isFinite(Number(job.durationDays)) && Number(job.durationDays) > 0
      ? Math.round(Number(job.durationDays))
      : 1;

  const pseudoSchedule = {
    id: job.id,
    jobId: job.id,
    title: job.title,
    workDate,
    endDate: endKey,
    durationDays: duration,
    workTime: job.workTime || "08:00~17:00",
  };
  return buildSiteEventsFromSchedule(pseudoSchedule);
}

export function buildPersonalCalendarEvent(personalEvent, source = CALENDAR_EVENT_SOURCE.ILDANGMAP) {
  if (!personalEvent?.dateKey) return null;
  const title = String(personalEvent.title || "").trim();
  if (!title) return null;
  const dateKey = String(personalEvent.dateKey);
  const id = String(personalEvent.id || `personal:${dateKey}:${title}`);
  const startTime = String(personalEvent.startTime || SCHEDULE_DEFAULT_START_TIME);
  const endTime = String(personalEvent.endTime || SCHEDULE_DEFAULT_END_TIME);
  const { startAt, endAt } = buildIsoRange(dateKey, startTime, endTime);
  return {
    id: `personal:${id}`,
    type: CALENDAR_EVENT_TYPE.PERSONAL,
    source,
    dateKey,
    title,
    startTime,
    endTime,
    startAt,
    endAt,
    personalEventId: id,
    externalId: personalEvent.externalId || "",
  };
}

/**
 * @param {{ schedules?: object[], personalEvents?: object[], externalEvents?: import('./calendarEventModel').CalendarEvent[] }} input
 */
export function collectCalendarEvents({ schedules = [], personalEvents = [], externalEvents = [] } = {}) {
  const site = (Array.isArray(schedules) ? schedules : []).flatMap((s) => buildSiteEventsFromSchedule(s));
  const personal = (Array.isArray(personalEvents) ? personalEvents : [])
    .map((ev) => buildPersonalCalendarEvent(ev))
    .filter(Boolean);
  const external = (Array.isArray(externalEvents) ? externalEvents : []).filter(
    (ev) => ev && ev.dateKey && ev.type && ev.source
  );
  return [...site, ...personal, ...external];
}

/**
 * @param {CalendarEvent[]} events
 * @returns {Map<string, { siteCount: number, personalCount: number, events: CalendarEvent[] }>}
 */
export function indexCalendarEventsByDate(events) {
  const map = new Map();
  (Array.isArray(events) ? events : []).forEach((ev) => {
    if (!ev?.dateKey) return;
    const bucket = map.get(ev.dateKey) || { siteCount: 0, personalCount: 0, events: [] };
    if (ev.type === CALENDAR_EVENT_TYPE.SITE) bucket.siteCount += 1;
    else if (ev.type === CALENDAR_EVENT_TYPE.PERSONAL) bucket.personalCount += 1;
    bucket.events.push(ev);
    map.set(ev.dateKey, bucket);
  });
  return map;
}

export function filterEventsOnDate(events, dateKey) {
  return (Array.isArray(events) ? events : []).filter((ev) => ev.dateKey === dateKey);
}

export function todayDateKey() {
  return toDateKey(new Date());
}
