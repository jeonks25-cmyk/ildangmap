import { CALENDAR_EVENT_TYPE, collectCalendarEvents } from "./calendarEventModel";
import { scheduleCoversDate } from "./scheduleModel";
import { abbreviateSiteTitle } from "./scheduleSiteDisplay";
import { resolveFieldScheduleColor, resolvePersonalEventColor } from "../constants/scheduleColors";

import { SCHEDULE_DEFAULT_END_TIME, SCHEDULE_DEFAULT_START_TIME } from "../constants/scheduleDefaults";

function parseTimeToMinutes(workTime) {
  const m = String(workTime || "").match(/(\d{1,2}):(\d{2})/);
  if (!m) return 24 * 60;
  return Number(m[1]) * 60 + Number(m[2]);
}

function formatTimeRange(startTime, endTime) {
  const s = String(startTime || "").trim() || SCHEDULE_DEFAULT_START_TIME;
  const e = String(endTime || "").trim() || SCHEDULE_DEFAULT_END_TIME;
  return `${s}~${e}`;
}

function getSiteAddress(schedule) {
  return schedule?.fullAddress || schedule?.shortRegion || schedule?.regionLabel || schedule?.address || "";
}

/**
 * @typedef {'site'|'personal'} DayEntryKind
 * @typedef {{ id: string, kind: DayEntryKind, title: string, shortTitle: string, time: string, colorId: string, address?: string, memo?: string, schedule?: object, personalEvent?: object, sortKey: number }} UnifiedDayEntry
 */

/** 선택일 통합 일정 (현장 + 개인) */
export function buildUnifiedDayEntries({ schedules = [], personalEvents = [], dateKey }) {
  const items = [];

  (Array.isArray(schedules) ? schedules : [])
    .filter((s) => scheduleCoversDate(s, dateKey))
    .forEach((schedule) => {
      const title = String(schedule.title || "현장").trim();
      items.push({
        id: `site-${schedule.id}`,
        kind: "site",
        title,
        shortTitle: abbreviateSiteTitle(title, schedule.craft),
        time: schedule.workTime || "시간 미정",
        colorId: resolveFieldScheduleColor(schedule),
        address: getSiteAddress(schedule),
        memo: "",
        schedule,
        sortKey: parseTimeToMinutes(schedule.workTime),
      });
    });

  (Array.isArray(personalEvents) ? personalEvents : [])
    .filter((e) => e?.dateKey === dateKey)
    .forEach((personal) => {
      const title = String(personal.title || "").trim();
      items.push({
        id: `personal-${personal.id}`,
        kind: "personal",
        title,
        shortTitle: abbreviateSiteTitle(title, ""),
        time: formatTimeRange(personal.startTime, personal.endTime),
        colorId: resolvePersonalEventColor(personal),
        address: "",
        memo: String(personal.memo || "").trim(),
        personalEvent: personal,
        sortKey: parseTimeToMinutes(personal.startTime),
      });
    });

  return items.sort((a, b) => a.sortKey - b.sortKey || a.title.localeCompare(b.title, "ko"));
}

/** 날짜별 캘린더 셀용 라벨 (최대 2개 + 나머지 건수) */
export function buildCalendarCellLabels({ schedules = [], personalEvents = [], dateKey, maxVisible = 2 }) {
  const events = collectCalendarEvents({ schedules, personalEvents });
  const dayEvents = events
    .filter((ev) => ev.dateKey === dateKey)
    .map((ev) => {
      if (ev.type === CALENDAR_EVENT_TYPE.SITE) {
        const schedule = (Array.isArray(schedules) ? schedules : []).find(
          (s) => String(s.id) === String(ev.scheduleId)
        );
        const title = String(ev.title || "현장");
        return {
          id: ev.id,
          shortTitle: abbreviateSiteTitle(title, schedule?.craft),
          colorId: resolveFieldScheduleColor(schedule || {}),
          sortKey: parseTimeToMinutes(schedule?.workTime || ev.startTime),
        };
      }
      const personal = (Array.isArray(personalEvents) ? personalEvents : []).find(
        (p) => String(p.id) === String(ev.personalEventId)
      );
      const title = String(ev.title || "");
      return {
        id: ev.id,
        shortTitle: abbreviateSiteTitle(title, ""),
        colorId: resolvePersonalEventColor(personal || { color: "gray" }),
        sortKey: parseTimeToMinutes(personal?.startTime || ev.startTime),
      };
    })
    .sort((a, b) => a.sortKey - b.sortKey);

  const visible = dayEvents.slice(0, maxVisible);
  const extra = Math.max(0, dayEvents.length - visible.length);
  return { visible, extra, total: dayEvents.length };
}
