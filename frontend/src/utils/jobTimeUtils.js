import { getJobWorkDateKey } from "./jobModel";

function toTodayDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseTimeToMinutes(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function getJobEndTime(job) {
  if (typeof job?.endTime === "string" && job.endTime.trim()) return job.endTime.trim();
  const text = String(job?.workTime || "").trim();
  const match = text.match(/\d{1,2}:\d{2}\s*~\s*(\d{1,2}:\d{2})/);
  return match ? match[1] : "";
}

/**
 * workDate + endTime 기준 만료 여부.
 * today > workDate 또는 (오늘 && now > endTime)
 */
export function isExpiredJob(job, now = new Date()) {
  if (!job) return false;
  const workDateKey = getJobWorkDateKey(job);
  if (!workDateKey) return false;

  const todayKey = toTodayDateKey(now);
  if (workDateKey < todayKey) return true;
  if (workDateKey > todayKey) return false;

  const endMin = parseTimeToMinutes(getJobEndTime(job));
  if (endMin == null) return false;

  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin > endMin;
}
