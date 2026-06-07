import { writeJsonStorage } from "../store/storeUtils";

export const BRIEFING_POSTS_STORAGE_KEY = "ildangmap_briefing_posts_v1";

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}

/** @returns {Record<string, Array<{id: string, jobId: number, body: string, postType: string, authorUserId: number, authorName: string, createdAt: string}>>} */
export function loadAllBriefingPostsByJob() {
  const parsed = readJson(BRIEFING_POSTS_STORAGE_KEY, {});
  return parsed && typeof parsed === "object" ? parsed : {};
}

export function loadBriefingPostsForJob(jobId) {
  const all = loadAllBriefingPostsByJob();
  const key = String(jobId);
  const list = all[key];
  return Array.isArray(list) ? list.slice() : [];
}

export function saveBriefingPostsForJob(jobId, posts) {
  const all = { ...loadAllBriefingPostsByJob() };
  all[String(jobId)] = Array.isArray(posts) ? posts : [];
  writeJsonStorage(BRIEFING_POSTS_STORAGE_KEY, all);
  return all[String(jobId)];
}

const BF_PREFIX = "bf:";

export function loadBriefingPostsForBriefingId(briefingId) {
  const id = String(briefingId || "").trim();
  if (!id) return [];
  const all = loadAllBriefingPostsByJob();
  const key = `${BF_PREFIX}${id}`;
  const list = all[key];
  return Array.isArray(list) ? list.slice() : [];
}

export function saveBriefingPostsForBriefingId(briefingId, posts) {
  const id = String(briefingId || "").trim();
  if (!id) return [];
  const all = { ...loadAllBriefingPostsByJob() };
  const key = `${BF_PREFIX}${id}`;
  all[key] = Array.isArray(posts) ? posts : [];
  writeJsonStorage(BRIEFING_POSTS_STORAGE_KEY, all);
  return all[key];
}
