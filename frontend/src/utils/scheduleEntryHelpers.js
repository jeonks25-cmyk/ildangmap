import { CALENDAR_EVENT_TYPE } from "./calendarEventModel";
import { scheduleDateKeyFromWorkDate } from "./fieldScheduleModel";
import { parseWorkTimeParts } from "./fieldSiteScheduleParser";
import { resolveFieldScheduleColor } from "../constants/scheduleColors";
import { addDaysToDateKey, getScheduleEndDateKey } from "./scheduleModel";
import { buildUnifiedDayEntries } from "./scheduleDayEntries";
import { contactStableUserId } from "./fieldContactsMock";

/** 현장 일정 메모 통합 */
export function resolveScheduleMemo(schedule) {
  if (!schedule) return "";
  const chunks = [
    schedule.calendarMemo,
    schedule.workDetails,
    schedule.specialNote,
    ...(Array.isArray(schedule.summaryLines) ? schedule.summaryLines : []),
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  return chunks.join("\n");
}

/** scheduleInvites → 연락처 id 목록 */
export function scheduleInvitesToParticipantIds(schedule, contacts = []) {
  const inviteUserIds = new Set(
    (Array.isArray(schedule?.scheduleInvites) ? schedule.scheduleInvites : []).map((iv) =>
      String(iv.userId)
    )
  );
  return (Array.isArray(contacts) ? contacts : [])
    .filter((c) => inviteUserIds.has(String(contactStableUserId(c))))
    .map((c) => String(c.id));
}

/** 참여자 표시 이름 목록 */
export function resolveEntryParticipantNames(entry) {
  if (!entry) return [];
  if (entry.kind === "personal") return [];
  const schedule = entry.schedule;
  const fromInvites = (Array.isArray(schedule?.scheduleInvites) ? schedule.scheduleInvites : [])
    .map((iv) => String(iv.name || "").trim())
    .filter(Boolean);
  if (fromInvites.length) return fromInvites;
  const fromWorkers = (Array.isArray(schedule?.workerAssignments) ? schedule.workerAssignments : [])
    .map((w) => String(w.name || w.displayName || "").trim())
    .filter(Boolean);
  if (fromWorkers.length) return fromWorkers;
  if (schedule?.assignedWorker) return [String(schedule.assignedWorker).trim()];
  return [];
}

/** composer initial from day entry */
export function entryToComposerInitial(entry) {
  if (!entry) return null;
  if (entry.kind === "personal" && entry.personalEvent) {
    const pe = entry.personalEvent;
    return {
      id: pe.id,
      entryType: "personal",
      title: pe.title,
      dateKey: pe.dateKey,
      workDateStart: pe.dateKey,
      workDateEnd: pe.dateKey,
      startTime: pe.startTime,
      endTime: pe.endTime,
      color: pe.color || "gray",
      memo: pe.memo || "",
    };
  }
  if (entry.kind === "site" && entry.schedule) {
    const schedule = entry.schedule;
    const { start, end } = parseWorkTimeParts(schedule.workTime || "08:00~17:00");
    const startKey = scheduleDateKeyFromWorkDate(schedule.workDate);
    return {
      id: schedule.id,
      entryType: "site",
      title: schedule.title || "",
      dateKey: startKey,
      workDateStart: startKey,
      workDateEnd: getScheduleEndDateKey(schedule) || startKey,
      startTime: start,
      endTime: end,
      color: resolveFieldScheduleColor(schedule),
      memo: resolveScheduleMemo(schedule),
      schedule,
    };
  }
  return null;
}

/** 복사용 composer initial — id 없음, 날짜 +1일 */
export function entryToCopyComposerInitial(entry) {
  const base = entryToComposerInitial(entry);
  if (!base) return null;
  const sourceKey = base.workDateStart || base.dateKey;
  const nextKey = addDaysToDateKey(sourceKey, 1) || sourceKey;
  const { id, ...rest } = base;
  return {
    ...rest,
    workDateStart: nextKey,
    workDateEnd: nextKey,
    dateKey: nextKey,
  };
}

/** 캘린더 이벤트 id → UnifiedDayEntry */
export function resolveDayEntryFromEventId({ eventId, dateKey, schedules = [], personalEvents = [] }) {
  const raw = String(eventId || "");
  if (raw.startsWith("site:")) {
    const parts = raw.split(":");
    const scheduleId = parts[1];
    const schedule = (Array.isArray(schedules) ? schedules : []).find(
      (s) => String(s?.id) === String(scheduleId)
    );
    if (!schedule) return null;
    const key = dateKey || parts[2] || scheduleDateKeyFromWorkDate(schedule.workDate);
    return buildUnifiedDayEntries({ schedules: [schedule], personalEvents: [], dateKey: key })[0] || null;
  }
  if (raw.startsWith("personal:")) {
    const personalId = raw.slice("personal:".length);
    const personal = (Array.isArray(personalEvents) ? personalEvents : []).find(
      (e) => String(e?.id) === String(personalId)
    );
    if (!personal) return null;
    const key = dateKey || personal.dateKey;
    return buildUnifiedDayEntries({ schedules: [], personalEvents: [personal], dateKey: key })[0] || null;
  }
  return null;
}

export function formatEntryDateLabel(entry) {
  if (!entry) return "";
  if (entry.kind === "personal") {
    return entry.personalEvent?.dateKey || "";
  }
  const schedule = entry.schedule;
  if (!schedule) return "";
  const start = scheduleDateKeyFromWorkDate(schedule.workDate);
  const end = getScheduleEndDateKey(schedule);
  if (end && end !== start) return `${start} ~ ${end}`;
  return start;
}

export function entryKindLabel(entry) {
  if (!entry) return "";
  return entry.kind === "personal" ? "개인 일정" : "현장 일정";
}

export { CALENDAR_EVENT_TYPE };
