import { useSiteBoardStore } from "../store/useSiteBoardStore";
import { loadBriefingPostsForJob } from "./briefingPostsStorage";

export function toLocalDateKey(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function loadPostsForSchedule(schedule) {
  if (!schedule) return [];
  const bid = String(schedule.briefingId || "").trim();
  if (bid) {
    const slice = useSiteBoardStore.getState().getBoardSlice(bid);
    return Array.isArray(slice.posts) ? slice.posts : [];
  }
  const jid = schedule.jobId == null ? NaN : Number(schedule.jobId);
  if (Number.isFinite(jid) && jid > 0) return loadBriefingPostsForJob(jid);
  return [];
}

/** 오늘(로컬) 작성된 운영 로그 건수 mock */
export function countOpsPostsToday(schedule, todayDateKey) {
  const key = String(todayDateKey || "").trim();
  if (!key) return 0;
  return loadPostsForSchedule(schedule).filter((p) => p && toLocalDateKey(p.createdAt) === key).length;
}

/** 출입 안내가 일정/Job에라도 있는지 */
export function hasEntryInfo(schedule, job) {
  const a = String(schedule?.entryInfo || schedule?.accessPassword || "").trim();
  if (a) return true;
  const b = String(job?.accessNote || job?.memo || "").trim();
  return Boolean(b);
}
