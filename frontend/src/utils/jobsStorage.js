import { TRADE_KEYS } from "./jobTrade";
import { migrateJob } from "./jobModel";
import { prepareOyajiDemoJobs } from "./demoOyajiWeekAlign";
import { initialJobs as initialJobsSeed } from "./initialJobsSeed";
import { isBetaSeedMode } from "./betaSeed";
import { BETA_JOBS } from "./betaTestSeed";

export const TRADE_SET = new Set(TRADE_KEYS);

export const JOBS_STORAGE_KEY = "jobs_v7";
const LEGACY_KEYS = ["jobs_v4", "jobs_v3", "jobs_v2"];

/** 데모 시드 — canonical fields: id, title, address, addressDetail?, date, participants, briefing, alerts (+ extras) */
export const initialJobs = isBetaSeedMode() ? BETA_JOBS : initialJobsSeed;

export function mergeJobsWithSeedData(list) {
  const parsed = Array.isArray(list) ? list.filter((job) => job && typeof job === "object") : [];
  const seedById = new Map(
    initialJobs
      .filter((job) => job && typeof job === "object")
      .map((job) => [Number(job.id), job])
      .filter(([id]) => Number.isFinite(id))
  );

  const merged = parsed.map((job, index) => {
    const normalizedId = Number(job.id);
    const seed = Number.isFinite(normalizedId) ? seedById.get(normalizedId) : null;
    if (seed) seedById.delete(normalizedId);
    return migrateJob({
      ...(seed || {}),
      ...job,
      id: Number.isFinite(job.id) ? job.id : Date.now() + index,
      trade: TRADE_SET.has(job.trade) ? job.trade : seed?.trade || "조공",
    });
  });

  const missingSeeds = [...seedById.values()].map((job) => migrateJob(job));
  return prepareOyajiDemoJobs([...merged, ...missingSeeds]);
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
    if (!raw) return prepareOyajiDemoJobs(initialJobs.map(migrateJob));
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return prepareOyajiDemoJobs(initialJobs.map(migrateJob));
    return mergeJobsWithSeedData(parsed);
  } catch (e) {
    return prepareOyajiDemoJobs(initialJobs.map(migrateJob));
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
