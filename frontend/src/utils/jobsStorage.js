import { TRADE_KEYS } from "./jobTrade";
import { migrateJob } from "./jobModel";

export const TRADE_SET = new Set(TRADE_KEYS);

/** @deprecated 베타: 데모 시드 제거 — 빈 배열 유지 */
export const initialJobs = [];

export const JOBS_STORAGE_KEY = "jobs_v8";
const LEGACY_KEYS = ["jobs_v7", "jobs_v4", "jobs_v3", "jobs_v2"];

export function mergeJobsWithSeedData(list) {
  const parsed = Array.isArray(list) ? list.filter((job) => job && typeof job === "object") : [];
  return parsed.map((job, index) =>
    migrateJob({
      ...job,
      id: Number.isFinite(Number(job.id)) ? job.id : Date.now() + index,
      trade: TRADE_SET.has(job.trade) ? job.trade : job.trade || "조공",
    })
  );
}

export function loadStoredJobs() {
  try {
    let raw = localStorage.getItem(JOBS_STORAGE_KEY);
    if (!raw) {
      for (const k of LEGACY_KEYS) {
        raw = localStorage.getItem(k);
        if (raw) break;
      }
    }
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return mergeJobsWithSeedData(parsed);
  } catch (_) {
    return [];
  }
}

export function saveStoredJobs(list) {
  const normalized = mergeJobsWithSeedData(Array.isArray(list) ? list : []);
  try {
    localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(normalized));
  } catch (_) {
    /* noop */
  }
  return normalized;
}
