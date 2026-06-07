/**
 * 현장 흐름 — jobs 파생 (별도 store 없음, Notification과 분리)
 */
import { jobMatchesRegionPref } from "../context/UserMapPreferencesContext";
import {
  CRAFT_LABEL,
  getJobCraft,
  getJobWorkDateKey,
  getPostedAtDate,
  JOB_STATUS,
  migrateJob,
  normalizeLifecycleStatus,
} from "./jobModel";
import {
  getJobManpowerCounts,
  getOyajiSiteShortName,
  isAfternoonJoinJob,
  isOyajiShortageJob,
  isOyajiUrgentJob,
  toTodayDateKey,
} from "./oyajiSiteModel";
import { isExpiredJob } from "./jobTimeUtils";

export const FLOW_KIND = {
  URGENT: "urgent",
  FILLED: "filled",
  AFTERNOON: "afternoon",
  STARTED: "started",
  DONE: "done",
  RECRUITING: "recruiting",
};

/** job에 flowAt / flowKind 파생 (mutate 없이 spread) */
export function enrichJobFieldFlow(job) {
  const j = migrateJob(job);
  if (!j) return j;

  const flowAt = j.flowAt || getPostedAtDate(j).toISOString();
  let flowKind = j.flowKind;

  if (!flowKind) {
    const st = normalizeLifecycleStatus(j);
    if (st === JOB_STATUS.COMPLETED || st === JOB_STATUS.CANCELLED) {
      flowKind = FLOW_KIND.DONE;
    } else if (st === JOB_STATUS.WORKING) {
      flowKind = FLOW_KIND.STARTED;
    } else if (isOyajiUrgentJob(j)) {
      flowKind = FLOW_KIND.URGENT;
    } else if (!isOyajiShortageJob(j) && getJobManpowerCounts(j).confirmed >= getJobManpowerCounts(j).required) {
      flowKind = FLOW_KIND.FILLED;
    } else if (isAfternoonJoinJob(j)) {
      flowKind = FLOW_KIND.AFTERNOON;
    } else {
      flowKind = FLOW_KIND.RECRUITING;
    }
  }

  return { ...j, flowAt, flowKind };
}

export function formatFlowRelativeTime(iso, now = new Date()) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "방금";
  const diffMin = Math.max(0, Math.floor((now.getTime() - t) / 60000));
  if (diffMin < 2) return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h}시간 전`;
  return "오늘";
}

function flowTone(flowKind) {
  if (flowKind === FLOW_KIND.URGENT) return "urgent";
  if (flowKind === FLOW_KIND.DONE) return "muted";
  if (flowKind === FLOW_KIND.AFTERNOON) return "afternoon";
  return "normal";
}

/** 맥락만 (건수·인원은 StatusBar / overlay 담당) */
function buildFlowLabel(job) {
  const j = enrichJobFieldFlow(job);
  const name = getOyajiSiteShortName(j);
  const craft = CRAFT_LABEL[getJobCraft(j)] || "현장";

  switch (j.flowKind) {
    case FLOW_KIND.URGENT:
      return name;
    case FLOW_KIND.AFTERNOON:
      return `오후 · ${name}`;
    case FLOW_KIND.STARTED:
      return `${name} · ${craft}`;
    default:
      return `${name} · ${craft}`;
  }
}

const STRIP_OMIT_KINDS = new Set([FLOW_KIND.DONE, FLOW_KIND.FILLED]);

const KIND_PRIORITY = {
  [FLOW_KIND.URGENT]: 0,
  [FLOW_KIND.STARTED]: 1,
  [FLOW_KIND.FILLED]: 2,
  [FLOW_KIND.AFTERNOON]: 3,
  [FLOW_KIND.RECRUITING]: 4,
  [FLOW_KIND.DONE]: 5,
};

/**
 * @returns {Array<{ id: string, jobId, text: string, tone: string, flowAt: string }>}
 */
export function deriveFieldFlowEvents(jobs, regionLabel, { max = 3, todayKey = toTodayDateKey() } = {}) {
  const list = (Array.isArray(jobs) ? jobs : [])
    .filter((job) => job && !isExpiredJob(job))
    .map((job) => enrichJobFieldFlow(job))
    .filter((job) => !STRIP_OMIT_KINDS.has(job.flowKind))
    .filter((job) => {
      const dk = getJobWorkDateKey(job);
      return dk && dk === todayKey && jobMatchesRegionPref(job, regionLabel);
    })
    .map((job) => ({
      id: `flow-${job.id}-${job.flowKind}`,
      jobId: job.id,
      text: buildFlowLabel(job),
      tone: flowTone(job.flowKind),
      flowAt: job.flowAt,
      kind: job.flowKind,
      sortPri: KIND_PRIORITY[job.flowKind] ?? 9,
      sortTime: Date.parse(job.flowAt) || 0,
    }))
    .sort((a, b) => {
      if (a.sortPri !== b.sortPri) return a.sortPri - b.sortPri;
      return b.sortTime - a.sortTime;
    })
    .slice(0, max);

  return list.map(({ id, jobId, text, tone, flowAt }) => ({ id, jobId, text, tone, flowAt }));
}
