import { jobMatchesRegionPref } from "../context/UserMapPreferencesContext";
import { OYAJI_SITE_FILTER } from "../constants/oyajiSiteFilter";
import { formatPayShort } from "./formatPayShort";
import {
  buildFieldJobTitle,
  CRAFT_LABEL,
  getApplicantsArray,
  getJobCraft,
  getJobWorkDateKey,
  getTodayAttendanceCount,
  isLiveHelpJob,
  isUrgentJob,
  JOB_STATUS,
  migrateJob,
  normalizeLifecycleStatus,
} from "./jobModel";
import { isExpiredJob } from "./jobTimeUtils";
import { parseTimeRange } from "./primaryTodaySite";

export function toTodayDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isOyajiUrgentJob(job) {
  if (!job) return false;
  return isLiveHelpJob(job) || isUrgentJob(job);
}

export function isAfternoonJoinJob(job) {
  if (!job) return false;
  if (job.afternoonJoinOk === true) return true;
  if (job.workType === "afternoon") return true;
  const blob = `${job.workTime || ""} ${job.ownerMemo || ""} ${job.memo || ""}`;
  return /오후\s*합류|오후\s*가능|오후작업|오후\s*작업/.test(blob);
}

export function getOyajiSiteStatus(job) {
  if (!job) return OYAJI_SITE_FILTER.SCHEDULED;
  if (isOyajiUrgentJob(job)) return OYAJI_SITE_FILTER.URGENT;
  const st = normalizeLifecycleStatus(job);
  if (st === JOB_STATUS.COMPLETED || st === JOB_STATUS.CANCELLED) return OYAJI_SITE_FILTER.DONE;
  if (st === JOB_STATUS.WORKING) return OYAJI_SITE_FILTER.IN_PROGRESS;
  return OYAJI_SITE_FILTER.SCHEDULED;
}

export function getOyajiSiteStatusLabel(statusKey) {
  const map = {
    [OYAJI_SITE_FILTER.IN_PROGRESS]: "진행",
    [OYAJI_SITE_FILTER.SCHEDULED]: "예정",
    [OYAJI_SITE_FILTER.DONE]: "완료",
    [OYAJI_SITE_FILTER.URGENT]: "긴급",
  };
  return map[statusKey] || "예정";
}

export function countConfirmedApplicants(job) {
  const list = getApplicantsArray(job);
  let n = 0;
  for (const a of list) {
    const s = String(a?.status == null ? "" : a.status).toLowerCase();
    if (s === "confirmed" || s === "accepted") n += 1;
  }
  return n;
}

export function getJobManpowerCounts(job) {
  const j = migrateJob(job);
  const required = Math.max(1, getTodayAttendanceCount(j));
  const confirmed = countConfirmedApplicants(j);
  const shortage = Math.max(0, Number(j.shortageCount) || 0);
  return { confirmed, required, shortage };
}

export function isOyajiShortageJob(job) {
  return getJobManpowerCounts(job).shortage > 0;
}

/** 지도 말풍선용 짧은 현장명 */
export function getOyajiSiteShortName(job) {
  if (!job) return "현장";
  const j = migrateJob(job);
  const region = String(j.shortRegion || j.locationText || "").trim();
  const dong = region.split(/\s+/).filter(Boolean).pop() || region;
  const title = buildFieldJobTitle(j);
  const shortTitle = title.length > 12 ? `${title.slice(0, 11)}…` : title;
  if (dong && !shortTitle.includes(dong)) return `${dong} ${shortTitle}`;
  return shortTitle || dong || "현장";
}

/** 카드 한 줄: 인원 · 부족 · 긴급 · 오후합류 */
export function getOyajiSiteOpsLine(job) {
  if (!job) return "";
  const j = migrateJob(job);
  const required = Math.max(1, getTodayAttendanceCount(j));
  const confirmed = countConfirmedApplicants(j);
  const shortage = Math.max(0, Number(j.shortageCount) || 0);
  const parts = [`인원 ${confirmed}/${required}`];
  if (shortage > 0) parts.push(`부족 ${shortage}`);
  if (isAfternoonJoinJob(j)) parts.push("오후합류");
  return parts.join(" · ");
}

export function jobMatchesOyajiSiteFilter(job, filterKey) {
  if (!filterKey || filterKey === OYAJI_SITE_FILTER.ALL) return true;
  const status = getOyajiSiteStatus(job);
  if (filterKey === OYAJI_SITE_FILTER.URGENT) return isOyajiUrgentJob(job);
  return status === filterKey;
}

/** 홈 Hero 선정 우선순위 (낮을수록 먼저) */
export const OYAJI_HERO_TIER = {
  URGENT_SHORTAGE: 0,
  SHORTAGE: 1,
  STARTING_SOON: 2,
  IN_PROGRESS: 3,
  OTHER: 4,
  DONE: 99,
};

export function parseStartMinutes(job) {
  const j = migrateJob(job);
  const fromRange = parseTimeRange(j.workTime)?.start;
  if (fromRange != null) return fromRange;
  const m = String(j.startTime || "").match(/^(\d{1,2}):(\d{2})/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  return null;
}

export function isOyajiStartingSoon(job, now = new Date()) {
  if (getOyajiSiteStatus(job) !== OYAJI_SITE_FILTER.SCHEDULED) return false;
  const startMin = parseStartMinutes(job);
  if (startMin == null) return true;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return startMin - nowMin <= 180 && startMin - nowMin >= -30;
}

export function getOyajiHeroTier(job) {
  if (!job) return OYAJI_HERO_TIER.DONE;
  const st = getOyajiSiteStatus(job);
  if (st === OYAJI_SITE_FILTER.DONE) return OYAJI_HERO_TIER.DONE;
  const shortage = isOyajiShortageJob(job);
  const urgent = isOyajiUrgentJob(job);
  if (urgent && shortage) return OYAJI_HERO_TIER.URGENT_SHORTAGE;
  if (shortage) return OYAJI_HERO_TIER.SHORTAGE;
  if (isOyajiStartingSoon(job)) return OYAJI_HERO_TIER.STARTING_SOON;
  if (st === OYAJI_SITE_FILTER.IN_PROGRESS) return OYAJI_HERO_TIER.IN_PROGRESS;
  return OYAJI_HERO_TIER.OTHER;
}

function formatOyajiStartLabel(job) {
  const j = migrateJob(job);
  if (j.startTime && String(j.startTime).trim()) {
    const t = String(j.startTime).trim().slice(0, 5);
    return `${t} 시작`;
  }
  const startMin = parseStartMinutes(j);
  if (startMin != null) {
    const h = Math.floor(startMin / 60);
    const m = startMin % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} 시작`;
  }
  const wt = String(j.workTime || "").trim();
  if (wt.includes("~")) {
    return `${wt.split("~")[0].trim()} 시작`;
  }
  return wt ? `${wt} 시작` : "";
}

function formatOyajiCraftPeriod(job) {
  const craft = CRAFT_LABEL[getJobCraft(job)] || "현장";
  const blob = `${job?.workTime || ""} ${job?.workType || ""}`;
  let period = "오전";
  if (/오후|afternoon/i.test(blob) || job?.workType === "afternoon") period = "오후";
  else if (/야간|night/i.test(blob)) period = "야간";
  return `${craft} · ${period}`;
}

function formatOyajiPeriodWord(job) {
  const blob = `${job?.workTime || ""} ${job?.workType || ""}`;
  if (/오후|afternoon/i.test(blob) || job?.workType === "afternoon") return "오후";
  if (/야간|night/i.test(blob)) return "야간";
  return "오전";
}

/** 현장 시간감 — ERP 일정 아님, 한 줄 공기 */
export function getOyajiSiteTimeSense(job, now = new Date()) {
  const j = migrateJob(job);
  const st = getOyajiSiteStatus(j);
  if (isOyajiUrgentJob(j)) return "지금 바로 필요";
  if (st === OYAJI_SITE_FILTER.DONE) return "오늘 종료 예정";
  if (st === OYAJI_SITE_FILTER.IN_PROGRESS) {
    return `${formatOyajiPeriodWord(j)} 작업 진행중`;
  }

  const startMin = parseStartMinutes(j);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (st === OYAJI_SITE_FILTER.SCHEDULED && startMin != null) {
    const diff = startMin - nowMin;
    if (diff > 0 && diff <= 45) {
      const bucket = diff <= 30 ? 30 : 45;
      return `${bucket}분 뒤 시작`;
    }
    if (diff > 45 && diff < 90) return "1시간 뒤 시작";
    if (diff >= 90 && diff <= 150) return "2시간 뒤 시작";
    if (diff > 150 && diff < 24 * 60) {
      const h = Math.floor(diff / 60);
      return `${h}시간 뒤 시작`;
    }
    if (diff <= 0 && diff > -45) return "곧 시작";
    const startLabel = formatOyajiStartLabel(j);
    if (startLabel) return startLabel;
  }

  if (st === OYAJI_SITE_FILTER.SCHEDULED) {
    const startLabel = formatOyajiStartLabel(j);
    return startLabel || "오늘 예정";
  }
  return "";
}

/** @returns {{ lead: string, timeSense: string, subline: string, craftPeriod: string, tier: number }} */
export function getOyajiHeroDisplay(job) {
  const j = migrateJob(job);
  const name = getOyajiSiteShortName(j);
  const { shortage } = getJobManpowerCounts(j);
  const urgent = isOyajiUrgentJob(j);
  const tier = getOyajiHeroTier(j);
  const needsWarn = shortage > 0 || urgent;
  const subline = shortage > 0 ? `${shortage}명 부족` : "";
  return {
    lead: needsWarn ? `⚠ ${name}` : name,
    timeSense: getOyajiSiteTimeSense(j),
    subline,
    craftPeriod: formatOyajiCraftPeriod(j),
    tier,
  };
}

function filterOyajiTodayJobs(jobs, regionLabel, todayKey = toTodayDateKey()) {
  return (Array.isArray(jobs) ? jobs : [])
    .filter((job) => job && !isExpiredJob(job))
    .map((job) => migrateJob(job))
    .filter((job) => {
      const dk = getJobWorkDateKey(job);
      return dk && dk === todayKey;
    })
    .filter((job) => jobMatchesRegionPref(job, regionLabel));
}

export function pickOyajiHeroJob(jobs, regionLabel, todayKey = toTodayDateKey()) {
  const candidates = filterOyajiTodayJobs(jobs, regionLabel, todayKey)
    .map((job) => ({ job, tier: getOyajiHeroTier(job), startMin: parseStartMinutes(job) ?? 24 * 60 }))
    .filter((row) => row.tier < OYAJI_HERO_TIER.DONE);

  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (a.startMin !== b.startMin) return a.startMin - b.startMin;
    return String(getOyajiSiteShortName(a.job)).localeCompare(String(getOyajiSiteShortName(b.job)), "ko");
  });

  return candidates[0].job;
}

export function buildOyajiTodaySites({ jobs, regionLabel, filterKey, todayKey = toTodayDateKey() }) {
  const list = filterOyajiTodayJobs(jobs, regionLabel, todayKey).filter((job) =>
    jobMatchesOyajiSiteFilter(job, filterKey)
  );

  return list
    .map((job) => ({
      job,
      status: getOyajiSiteStatus(job),
      opsLine: getOyajiSiteOpsLine(job),
      heroTier: getOyajiHeroTier(job),
    }))
    .sort((a, b) => {
      if (a.heroTier !== b.heroTier) return a.heroTier - b.heroTier;
      const sa = parseStartMinutes(a.job) ?? 24 * 60;
      const sb = parseStartMinutes(b.job) ?? 24 * 60;
      if (sa !== sb) return sa - sb;
      return String(buildFieldJobTitle(a.job)).localeCompare(String(buildFieldJobTitle(b.job)), "ko");
    });
}

export function countOyajiTodaySitesByStatus(jobs, regionLabel, todayKey = toTodayDateKey()) {
  const today = (Array.isArray(jobs) ? jobs : [])
    .filter((job) => job && !isExpiredJob(job))
    .map((job) => migrateJob(job))
    .filter((job) => getJobWorkDateKey(job) === todayKey)
    .filter((job) => jobMatchesRegionPref(job, regionLabel));

  const counts = {
    [OYAJI_SITE_FILTER.ALL]: today.length,
    [OYAJI_SITE_FILTER.IN_PROGRESS]: 0,
    [OYAJI_SITE_FILTER.SCHEDULED]: 0,
    [OYAJI_SITE_FILTER.DONE]: 0,
    [OYAJI_SITE_FILTER.URGENT]: 0,
  };

  for (const job of today) {
    const st = getOyajiSiteStatus(job);
    if (counts[st] != null) counts[st] += 1;
    if (isOyajiUrgentJob(job)) counts[OYAJI_SITE_FILTER.URGENT] += 1;
  }
  return counts;
}

export function computeOyajiMapOpsSummary(jobs, regionLabel, todayKey = toTodayDateKey()) {
  const today = (Array.isArray(jobs) ? jobs : [])
    .filter((job) => job && !isExpiredJob(job))
    .map((job) => migrateJob(job))
    .filter((job) => getJobWorkDateKey(job) === todayKey)
    .filter((job) => jobMatchesRegionPref(job, regionLabel));

  let urgentCount = 0;
  let shortagePeople = 0;
  for (const job of today) {
    if (isOyajiUrgentJob(job)) urgentCount += 1;
    shortagePeople += Math.max(0, Number(job.shortageCount) || 0);
  }

  return {
    todayCount: today.length,
    urgentCount,
    shortagePeople,
  };
}

/** FieldShareSheet용 최소 field 객체 */
export function jobToFieldSharePayload(job) {
  const j = migrateJob(job);
  if (!j) return null;
  return {
    id: j.id,
    fieldName: buildFieldJobTitle(j),
    address: j.address || j.shortAddress || j.fullAddress || "",
    region: j.shortRegion || j.locationText || "",
    date: getJobWorkDateKey(j),
    startTime: j.startTime || "",
    endTime: j.endTime || "",
    payLabel: j.pay != null ? `${formatPayShort(j.pay)}원` : "",
    jobType: j.craft || j.role || "",
    meetLocation: j.locationText || j.shortAddress || "",
    contactPhone: j.contactPhone || "",
    ownerName: j.ownerName || "",
    lat: j.lat,
    lng: j.lng,
  };
}
