import { buildIsoRange } from "../../utils/calendarEventModel";
import { getScheduleDateKeys } from "../../utils/scheduleModel";
import { parseWorkTimeParts } from "../../utils/fieldSiteScheduleParser";

/**
 * @typedef {Object} IcsEventInput
 * @property {string} uid
 * @property {string} title
 * @property {string} dateKey
 * @property {string} [startTime]
 * @property {string} [endTime]
 * @property {string} [memo]
 * @property {string} [location]
 */

export function personalEventToIcsInput(event) {
  if (!event?.dateKey || !event?.title) return null;
  return {
    uid: `ildangmap-pe-${event.id || Date.now()}@${event.dateKey}`,
    title: String(event.title).trim(),
    dateKey: event.dateKey,
    startTime: event.startTime || "08:00",
    endTime: event.endTime || "17:00",
    memo: event.memo || "",
    location: "",
  };
}

export function fieldScheduleToIcsInputs(schedule) {
  if (!schedule) return [];
  const dateKeys = getScheduleDateKeys(schedule);
  if (!dateKeys.length) return [];

  const title = String(schedule.title || schedule.siteLabel || "현장").trim() || "현장";
  const location = String(schedule.fullAddress || schedule.shortRegion || "").trim();
  const { start, end } = parseWorkTimeParts(schedule.workTime || "08:00~17:00");
  const memo = String(schedule.calendarMemo || schedule.specialNote || "").trim();
  const scheduleId = schedule.id != null ? String(schedule.id) : "field";

  return dateKeys.map((dateKey) => ({
    uid: `ildangmap-fs-${scheduleId}-${dateKey}@ildangmap.app`,
    title,
    dateKey,
    startTime: start,
    endTime: end,
    memo,
    location,
  }));
}

export function composerPayloadToIcsInput(payload) {
  if (!payload?.title || !payload?.dateKey) return null;
  const startKey = payload.dateKey;
  const endKey = payload.endDateKey || payload.workDateEnd || startKey;
  const keys = [];
  const [sy, sm, sd] = startKey.split("-").map(Number);
  const [ey, em, ed] = endKey.split("-").map(Number);
  const cursor = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) return null;
  while (cursor <= end) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    keys.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys.map((dateKey, index) => ({
    uid: `ildangmap-compose-${dateKey}-${index}@ildangmap.app`,
    title: String(payload.title).trim(),
    dateKey,
    startTime: payload.startTime || "08:00",
    endTime: payload.endTime || "17:00",
    memo: payload.memo || "",
    location: "",
  }));
}

export function icsInputToDateRange(input) {
  return buildIsoRange(input.dateKey, input.startTime, input.endTime);
}
