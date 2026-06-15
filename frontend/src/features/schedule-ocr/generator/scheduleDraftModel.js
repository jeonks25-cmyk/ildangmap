import { SCHEDULE_DEFAULT_END_TIME, SCHEDULE_DEFAULT_START_TIME } from "../../../constants/scheduleDefaults";

/**
 * @typedef {Object} ScheduleOcrDraft
 * @property {string} id
 * @property {boolean} selected
 * @property {string} dateKey
 * @property {string} title
 * @property {string} startTime
 * @property {string} endTime
 * @property {string} memo
 * @property {string} color
 */

export function createScheduleOcrDraft({
  dateKey,
  title,
  startTime = SCHEDULE_DEFAULT_START_TIME,
  endTime = SCHEDULE_DEFAULT_END_TIME,
  memo = "",
  color = "blue",
  selected = true,
  id,
}) {
  const cleanTitle = String(title || "").trim();
  const cleanDate = String(dateKey || "").trim();
  if (!cleanTitle || !cleanDate) return null;
  return {
    id: id || `draft-${cleanDate}-${Math.random().toString(36).slice(2, 7)}`,
    selected,
    dateKey: cleanDate,
    title: cleanTitle,
    startTime,
    endTime,
    memo,
    color,
  };
}

export function draftsToPersonalPayloads(drafts) {
  return (Array.isArray(drafts) ? drafts : [])
    .filter((d) => d?.selected !== false && d?.title && d?.dateKey)
    .map((d) => ({
      title: d.title,
      dateKey: d.dateKey,
      startTime: d.startTime || SCHEDULE_DEFAULT_START_TIME,
      endTime: d.endTime || SCHEDULE_DEFAULT_END_TIME,
      memo: d.memo || "",
      color: d.color || "blue",
    }));
}
