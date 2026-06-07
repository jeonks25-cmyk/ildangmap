import { formatPublicAddress } from "./formatPublicAddress";
import { normalizeJobTrade } from "./jobTrade";
import { normalizeParticipantStatus } from "./jobPrivacyPolicy";
import {
  ANONYMOUS_SELF_WORKER_ID,
  canViewerApplyToJob,
  getSelfApplicantForViewer,
  hasViewerApplied,
  isJobOwner,
  parseApplicantUserNumericId,
  selfApplicantWorkerRefFromViewerId,
} from "./jobOwnership";

/** @deprecated 로컬 데모·API 익명 참여자 식별자 — `jobOwnership`의 `ANONYMOUS_SELF_WORKER_ID`와 동일 */
export const SELF_WORKER_ID = ANONYMOUS_SELF_WORKER_ID;

export const JOB_STATUS = {
  RECRUITING: "recruiting",
  FULL: "full",
  CONFIRMED: "confirmed",
  WORKING: "working",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  /** @deprecated 시드/구버전 */
  PENDING: "pending",
  /** @deprecated 시드/구버전 — 서버 `full`과 유사 */
  CLOSED: "closed",
};

export const STATUS_LABEL = {
  recruiting: "팀 연결 중",
  full: "마감",
  confirmed: "확정",
  working: "작업중",
  completed: "완료",
  cancelled: "취소",
  pending: "확정대기",
  closed: "마감",
};

export const WORK_TYPE_LABEL = {
  fullDay: "종일",
  morning: "오전반",
  afternoon: "오후반",
  shortHelp: "2시간헬프",
};

export const LIVE_RECRUIT_STATUS = {
  RECRUITING: "recruiting",
  CLOSING_SOON: "closingSoon",
  URGENT: "urgent",
  CLOSED: "closed",
  RECRUITMENT_FULL: "recruitmentFull",
  ROSTER_CONFIRMED: "rosterConfirmed",
  ON_SITE_WORK: "onSiteWork",
};

export const LIVE_RECRUIT_STATUS_META = {
  recruiting: { label: "팀 연결 중", tone: "recruiting", marker: "🟢" },
  closingSoon: { label: "곧마감", tone: "closing", marker: "🟠" },
  urgent: { label: "긴급", tone: "urgent", marker: "🔴" },
  closed: { label: "팀 연결 완료", tone: "closed", marker: "⚫" },
  recruitmentFull: { label: "마감", tone: "closed", marker: "⚫" },
  rosterConfirmed: { label: "확정", tone: "closing", marker: "🟠" },
  onSiteWork: { label: "작업중", tone: "working", marker: "🔵" },
};

export const SETTLEMENT_STATUS = {
  UNPAID: "unpaid",
  SETTLED: "settled",
};

export const SETTLEMENT_STATUS_META = {
  unpaid: { label: "미정산", tone: "unpaid" },
  settled: { label: "정산완료", tone: "settled" },
};

export const WORKER_STAGE = {
  NONE: "none",
  DEPARTED: "departed",
  ARRIVED: "arrived",
  DONE: "done",
};

export const WORKER_STAGE_META = {
  none: { label: "출근 전", shortLabel: "대기" },
  departed: { label: "출발 완료", shortLabel: "출발" },
  arrived: { label: "도착 완료", shortLabel: "도착" },
  done: { label: "작업완료", shortLabel: "완료" },
};

/** 공정(필터용) */
export const CRAFT_KEYS = ["film", "tile", "wallpaper", "paint", "electric", "facility"];

export const CRAFT_LABEL = {
  film: "필름",
  tile: "타일",
  wallpaper: "도배",
  paint: "페인트",
  electric: "전기",
  facility: "설비",
};

export const CRAFT_EMOJI = {
  film: "🪟",
  tile: "🧱",
  wallpaper: "🎨",
  paint: "🖌️",
  electric: "⚡",
  facility: "🔧",
};

const VALID_CRAFT = new Set(CRAFT_KEYS);
const VALID_JOB_LIFECYCLE = new Set(Object.values(JOB_STATUS));

/** API/시드 값을 UI 생애주기 문자열로 정규화 */
export function normalizeLifecycleStatus(job) {
  const raw = job?.status;
  const s = raw == null || raw === "" ? JOB_STATUS.RECRUITING : String(raw).toLowerCase().trim();
  if (s === JOB_STATUS.CLOSED) return JOB_STATUS.FULL;
  if (VALID_JOB_LIFECYCLE.has(s)) return s;
  return JOB_STATUS.RECRUITING;
}
const VALID_SETTLEMENT_STATUS = new Set(Object.values(SETTLEMENT_STATUS));
const VALID_WORKER_STAGE = new Set(Object.values(WORKER_STAGE));

function toSafeInt(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? Math.round(num) : fallback;
}

function getFallbackWorkerStage(job, idNum) {
  if (VALID_WORKER_STAGE.has(job?.workerStage)) return job.workerStage;
  if (normalizeLifecycleStatus(job) === JOB_STATUS.COMPLETED) return WORKER_STAGE.DONE;
  const seed = Number.isFinite(idNum) ? Math.abs(idNum) % 4 : 0;
  if (seed === 1) return WORKER_STAGE.DEPARTED;
  if (seed === 2) return WORKER_STAGE.ARRIVED;
  return WORKER_STAGE.NONE;
}

function getFallbackWorkingCount(attendanceCount, workerStage) {
  if (!attendanceCount) return 0;
  if (workerStage === WORKER_STAGE.DONE) return 0;
  if (workerStage === WORKER_STAGE.ARRIVED) return Math.max(1, Math.min(attendanceCount, Math.ceil(attendanceCount / 2)));
  if (workerStage === WORKER_STAGE.DEPARTED) return Math.max(0, Math.min(attendanceCount, Math.floor(attendanceCount / 3)));
  return 0;
}

export function isUrgentJob(job) {
  if (!job) return false;
  if (job.isUrgent || job.isEmergency) return true;
  const tags = Array.isArray(job.tags) ? job.tags.map(String) : [];
  if (tags.some((t) => t.includes("급구") || t.includes("긴급") || t.includes("펑크"))) return true;
  const title = String(job.title || "");
  return title.includes("급구") || title.includes("긴급") || title.includes("펑크");
}

export function getRecruitLiveStatus(job) {
  if (!job) return LIVE_RECRUIT_STATUS.RECRUITING;
  const st = normalizeLifecycleStatus(job);
  if (st === JOB_STATUS.WORKING) return LIVE_RECRUIT_STATUS.ON_SITE_WORK;
  if (st === JOB_STATUS.COMPLETED || st === JOB_STATUS.CANCELLED) return LIVE_RECRUIT_STATUS.CLOSED;
  if (st === JOB_STATUS.CONFIRMED) return LIVE_RECRUIT_STATUS.ROSTER_CONFIRMED;
  if (st === JOB_STATUS.FULL) return LIVE_RECRUIT_STATUS.RECRUITMENT_FULL;
  if (st === JOB_STATUS.PENDING) return LIVE_RECRUIT_STATUS.CLOSING_SOON;
  if (isUrgentJob(job)) return LIVE_RECRUIT_STATUS.URGENT;
  if (job.closingSoon) return LIVE_RECRUIT_STATUS.CLOSING_SOON;
  return LIVE_RECRUIT_STATUS.RECRUITING;
}

export function getRecruitLiveStatusMeta(job) {
  const key = getRecruitLiveStatus(job);
  return LIVE_RECRUIT_STATUS_META[key] || LIVE_RECRUIT_STATUS_META.recruiting;
}

export function getMarkerStatusEmoji(job) {
  return getRecruitLiveStatusMeta(job).marker;
}

export function getSettlementStatus(job) {
  if (!job) return SETTLEMENT_STATUS.UNPAID;
  if (VALID_SETTLEMENT_STATUS.has(job.settlementStatus)) return job.settlementStatus;
  if (normalizeLifecycleStatus(job) === JOB_STATUS.COMPLETED) return SETTLEMENT_STATUS.SETTLED;
  return SETTLEMENT_STATUS.UNPAID;
}

export function getSettlementStatusMeta(job) {
  const key = getSettlementStatus(job);
  return SETTLEMENT_STATUS_META[key] || SETTLEMENT_STATUS_META.unpaid;
}

export function getTodayAttendanceCount(job) {
  const applicants = getApplicantsArray(job).length;
  const idNum = Number(job?.id);
  const fallback = Math.max(applicants + 2, 4 + (Number.isFinite(idNum) ? Math.abs(idNum) % 5 : 0));
  return toSafeInt(job?.attendanceCount, fallback);
}

export function getWorkerStage(job) {
  return getFallbackWorkerStage(job, Number(job?.id));
}

export function getWorkerStageMeta(job) {
  const key = getWorkerStage(job);
  return WORKER_STAGE_META[key] || WORKER_STAGE_META.none;
}

export function getCurrentWorkingCount(job) {
  const attendanceCount = getTodayAttendanceCount(job);
  const fallback = getFallbackWorkingCount(attendanceCount, getWorkerStage(job));
  return Math.min(attendanceCount, toSafeInt(job?.activeWorkersCount, fallback));
}

export function getSiteLiveStatusMeta(job) {
  if (getSettlementStatus(job) === SETTLEMENT_STATUS.SETTLED) {
    return { label: "정산완료", tone: "settled" };
  }
  const st = normalizeLifecycleStatus(job);
  if (st === JOB_STATUS.WORKING) {
    return { label: "작업중", tone: "working" };
  }
  if (getCurrentWorkingCount(job) > 0) {
    return { label: "작업중", tone: "working" };
  }
  const recruit = getRecruitLiveStatus(job);
  if (recruit === LIVE_RECRUIT_STATUS.CLOSED) {
    return { label: "팀 연결 완료", tone: "closed" };
  }
  return { label: "팀 연결 중", tone: "recruiting" };
}

export function isLiveHelpJob(job) {
  if (!job) return false;
  if (job.liveHelp === true) return true;
  if (job.workType === "shortHelp") return true;
  return isUrgentJob(job) && /~/.test(String(job.workTime || ""));
}

/** workType 기준 1~2시간 헬프(서버/클라이언트 shortHelp) — liveHelp 플래그와 별개로 좁혀 쓸 때 */
export function isShortHelp(job) {
  return Boolean(job && job.workType === "shortHelp");
}

/**
 * 긴급헬프·당일 긴급 현장 등 목록 정렬용 가중치 (0=보통, 높을수록 상단).
 * 완료/취소는 0으로 내려 리스트 하단·흐림 처리와 맞춘다.
 */
export function computeUrgencyLevel(job) {
  if (!job) return 0;
  const st = normalizeLifecycleStatus(job);
  if (st === JOB_STATUS.COMPLETED || st === JOB_STATUS.CANCELLED) return 0;
  const live = isLiveHelpJob(job);
  const urgent = isUrgentJob(job);
  const today = isJobWorkDateToday(job);
  if (live) {
    const tone = getHelpRemainingTone(job);
    if (tone === "critical") return 4;
    if (tone === "warning") return 3;
    if (today) return 3;
    return 2;
  }
  if (isShortHelp(job)) return 2;
  if (urgent && today) return 2;
  if (urgent) return 1;
  return 0;
}

/** 긴급헬프 탭 전용: 거리 → 마감 임박 → 당일 → 긴급·가중치 */
export function compareHelpTabJobsForMvp(a, b, getDistance) {
  const da = typeof getDistance === "function" ? getDistance(a) : 999;
  const db = typeof getDistance === "function" ? getDistance(b) : 999;
  if (da !== db) return da - db;
  const ra = getHelpRemainingMinutes(a);
  const rb = getHelpRemainingMinutes(b);
  const safeA = ra == null ? 999999 : ra;
  const safeB = rb == null ? 999999 : rb;
  if (safeA !== safeB) return safeA - safeB;
  const ta = isJobWorkDateToday(a) ? 1 : 0;
  const tb = isJobWorkDateToday(b) ? 1 : 0;
  if (ta !== tb) return tb - ta;
  if (isUrgentJob(a) !== isUrgentJob(b)) return isUrgentJob(b) ? 1 : -1;
  return computeUrgencyLevel(b) - computeUrgencyLevel(a);
}

/** 지도·현장 목록 공통: 긴급헬프 우선 → 긴급도 → 거리 */
export function compareJobsForMapList(a, b, getDistance) {
  const da = typeof getDistance === "function" ? getDistance(a) : 999;
  const db = typeof getDistance === "function" ? getDistance(b) : 999;
  const la = isLiveHelpJob(a) ? 1 : 0;
  const lb = isLiveHelpJob(b) ? 1 : 0;
  if (la !== lb) return lb - la;
  const wa = computeUrgencyLevel(a);
  const wb = computeUrgencyLevel(b);
  if (wa !== wb) return wb - wa;
  if (isUrgentJob(a) !== isUrgentJob(b)) return isUrgentJob(a) ? -1 : 1;
  return da - db;
}

export function getLiveHelpSummary(job) {
  if (!job) return null;
  const craftLabel = CRAFT_LABEL[getJobCraft(job)] || "현장";
  const time = String(job.helpTime || job.workTime || "오후 2~5시").trim();
  return {
    region: getPublicRegionLine(job),
    time,
    title: String(job.helpTitle || `${craftLabel} 헬프`).trim(),
    pay: String(job.helpPay || job.pay || "").trim(),
  };
}

function parseDateOrNull(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getHelpDeadlineDate(job) {
  if (!isLiveHelpJob(job)) return null;
  const explicit = parseDateOrNull(job?.helpExpiresAt);
  if (explicit) return explicit;
  const base = getPostedAtDate(job);
  const duration = toSafeInt(job?.helpDurationMinutes, 180);
  return new Date(base.getTime() + duration * 60000);
}

export function getHelpRemainingMinutes(job, now = new Date()) {
  if (!isLiveHelpJob(job)) return null;
  const deadline = getHelpDeadlineDate(job);
  if (!deadline) return null;
  const diffMinutes = Math.ceil((deadline.getTime() - now.getTime()) / 60000);
  return Math.max(0, diffMinutes);
}

export function getHelpRemainingTone(job, now = new Date()) {
  const st = normalizeLifecycleStatus(job);
  if (
    st === JOB_STATUS.FULL ||
    st === JOB_STATUS.CONFIRMED ||
    st === JOB_STATUS.WORKING ||
    st === JOB_STATUS.COMPLETED ||
    st === JOB_STATUS.CANCELLED
  ) {
    return "closed";
  }
  const remaining = getHelpRemainingMinutes(job, now);
  if (remaining == null) return "safe";
  if (remaining <= 0) return "closed";
  if (remaining <= 30) return "critical";
  if (remaining <= 60) return "warning";
  return "safe";
}

export function getHelpRemainingLabel(job, now = new Date()) {
  const remaining = getHelpRemainingMinutes(job, now);
  const st = normalizeLifecycleStatus(job);
  if (
    st === JOB_STATUS.FULL ||
    st === JOB_STATUS.CONFIRMED ||
    st === JOB_STATUS.WORKING ||
    st === JOB_STATUS.COMPLETED ||
    st === JOB_STATUS.CANCELLED ||
    remaining === 0
  ) {
    return "마감";
  }
  if (remaining == null) return "오늘 마감";
  if (remaining < 60) return `${remaining}분 남음`;
  return `${Math.ceil(remaining / 60)}시간 남음`;
}

export function getEstimatedTravelMinutes(job) {
  const distanceKm = Number(job?.distanceKm);
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 5;
  return Math.max(3, Math.round(distanceKm * 7));
}

export function getEstimatedTravelLabel(job) {
  return `현재 위치 기준 도보 ${getEstimatedTravelMinutes(job)}분`;
}

export function getHelpAtmosphere(job) {
  if (typeof job?.helpAtmosphere === "string" && job.helpAtmosphere.trim()) return job.helpAtmosphere.trim();
  const siteKind = String(job?.siteKind || "현장").trim();
  const craftLabel = CRAFT_LABEL[getJobCraft(job)] || "현장";
  const st = normalizeLifecycleStatus(job);
  if (st === JOB_STATUS.FULL || st === JOB_STATUS.CONFIRMED || st === JOB_STATUS.WORKING) {
    return "필요 인원을 확보해 마감된 상태입니다.";
  }
  return `${siteKind} ${craftLabel} 작업이 빠르게 돌고 있어 즉시 보조 투입이 필요한 분위기입니다.`;
}

/** 작업일 YYYY-MM-DD (없으면 "") */
export function getJobWorkDateKey(job) {
  const raw = job?.workDate || job?.date || job?.jobDate || "";
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isJobWorkDateToday(job, today = new Date()) {
  const k = getJobWorkDateKey(job);
  if (!k) return false;
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return k === `${y}-${m}-${d}`;
}

/** 지도 말풍선 마커 색: premium > urgent > today > normal */
export function getMapMarkerTone(job) {
  if (!job) return "normal";
  const st = normalizeLifecycleStatus(job);
  if (st === JOB_STATUS.COMPLETED || st === JOB_STATUS.CANCELLED) {
    return getRecruitLiveStatus(job) === LIVE_RECRUIT_STATUS.CLOSED ? "premium" : "normal";
  }
  if (isLiveHelpJob(job)) {
    const tone = getHelpRemainingTone(job);
    if (tone === "critical" || tone === "warning") return "urgent";
    return "urgent";
  }
  const recruitStatus = getRecruitLiveStatus(job);
  if (recruitStatus === LIVE_RECRUIT_STATUS.ON_SITE_WORK) return "today";
  if (recruitStatus === LIVE_RECRUIT_STATUS.CLOSED) return "premium";
  if (recruitStatus === LIVE_RECRUIT_STATUS.CLOSING_SOON) return "today";
  if (job.isPremium) return "premium";
  if (isUrgentJob(job)) return "urgent";
  if (isJobWorkDateToday(job)) return "today";
  return "normal";
}

export function getJobDongLabel(job) {
  const parts = String(getPublicRegionLine(job) || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return parts[parts.length - 1] || "";
}

/** 지역 + 현장종류 + 공정 + 직군 */
export function buildFieldJobTitle(job) {
  if (!job) return "현장";
  if (typeof job.fieldTitle === "string" && job.fieldTitle.trim()) return job.fieldTitle.trim();
  const dong = getJobDongLabel(job);
  const site = String(job.siteKind || "").trim();
  const craftLabel = CRAFT_LABEL[getJobCraft(job)] || "";
  const trade = normalizeJobTrade(job);
  /* 시선: 동네 → 공정·직군(첫 줄 핵심) → 현장 유형 순 — 잘릴 때도 작업 맥락이 앞쪽에 오도록 */
  const parts = [dong, craftLabel, trade, site].filter(Boolean);
  if (parts.length >= 2) return parts.join(" ");
  return String(job.title || "현장").trim() || "현장";
}

function inferCraft(job) {
  const blob = `${job?.title || ""} ${job?.description || ""} ${job?.memo || ""}`;
  if (/전기|배선|분전/.test(blob)) return "electric";
  if (/설비|배관|냉난방|급배수/.test(blob)) return "facility";
  if (/필름/.test(blob)) return "film";
  if (/타일/.test(blob)) return "tile";
  if (/도배|벽지/.test(blob)) return "wallpaper";
  if (/페인트|도장/.test(blob)) return "paint";
  return "film";
}

export function getJobCraft(job) {
  if (job && VALID_CRAFT.has(job.craft)) return job.craft;
  return inferCraft(job);
}

export function formatCraftWithEmoji(job) {
  const c = getJobCraft(job);
  return `${CRAFT_EMOJI[c] || ""} ${CRAFT_LABEL[c] || c}`.trim();
}

function parsePostedDate(job) {
  const raw = job?.postedAt || job?.createdAt;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/** 등록 시각 없을 때 데모용 (id 기반 고정 오프셋) */
function defaultPostedAtIso(job) {
  const id = Number(job?.id) || 1;
  const offsetsMs = [3 * 60 * 1000, 12 * 60 * 1000, 65 * 60 * 1000, 30 * 60 * 60 * 1000];
  const ix = Math.abs(id) % offsetsMs.length;
  return new Date(Date.now() - offsetsMs[ix]).toISOString();
}

export function getPostedAtDate(job) {
  return parsePostedDate(job) || new Date(defaultPostedAtIso(job));
}

/** 예: 3분 전, 1시간 전, 어제 */
export function formatPostedRelative(job, now = new Date()) {
  const d = getPostedAtDate(job);
  const diffMs = now.getTime() - d.getTime();
  if (diffMs < 45 * 1000) return "방금";
  const min = Math.floor(diffMs / 60000);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const post0 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayDiff = Math.round((today0 - post0) / 86400000);
  if (dayDiff === 1) return "어제";
  if (dayDiff > 1 && dayDiff < 8) return `${dayDiff}일 전`;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/** 최근 30분 이내 등록 → NEW */
export function isNewJobWithin30Min(job, now = new Date()) {
  const d = getPostedAtDate(job);
  return now.getTime() - d.getTime() <= 30 * 60 * 1000;
}

/** Canonical mock/API: job.participants (참여 요청자·확정 인원) */
export function getParticipantsArray(job) {
  if (!job) return [];
  const p = job.participants;
  if (Array.isArray(p)) return p.filter(Boolean);
  return [];
}

/** @deprecated use getParticipantsArray — applicants is kept in sync by migrateJob */
export function getApplicantsArray(job) {
  if (!job) return [];
  const fromParticipants = getParticipantsArray(job);
  if (fromParticipants.length > 0) return fromParticipants;
  const a = job.applicants;
  if (Array.isArray(a)) return a.filter(Boolean);
  return [];
}

export function getBriefingArray(job) {
  if (!job) return [];
  const b = job.briefing;
  return Array.isArray(b) ? b.filter(Boolean) : [];
}

export function getAlertsArray(job) {
  if (!job) return [];
  const a = job.alerts;
  return Array.isArray(a) ? a.filter(Boolean) : [];
}

export function applicantCount(job) {
  return getApplicantsArray(job).length;
}

export function hasSelfApplied(job, viewerApplicantUserId = null) {
  return hasViewerApplied(getApplicantsArray(job), viewerApplicantUserId);
}

export function getSelfApplicant(job, viewerApplicantUserId = null) {
  return getSelfApplicantForViewer(getApplicantsArray(job), viewerApplicantUserId);
}

export function canApplyToJob(job, viewerApplicantUserId = null) {
  const applicants = getApplicantsArray(job);
  return canViewerApplyToJob({ job, applicants, viewerApplicantUserId });
}

export function deriveJobOwnership(job, viewerApplicantUserId) {
  const applicants = getApplicantsArray(job);
  const isOwner = isJobOwner(job, viewerApplicantUserId);
  return {
    viewerApplicantUserId,
    hasApplied: hasViewerApplied(applicants, viewerApplicantUserId),
    isOwner,
    canApply: canViewerApplyToJob({ job, applicants, viewerApplicantUserId }),
    canEdit: isOwner,
    selfApplicant: getSelfApplicantForViewer(applicants, viewerApplicantUserId),
  };
}

/** 오야지 또는 승인된 참여자만 해당 Job의 현장 운영 기록(REST) 접근 */
export function canAccessJobBriefing(job, viewerApplicantUserId) {
  if (!job) return false;
  if (viewerApplicantUserId == null || !Number.isFinite(Number(viewerApplicantUserId))) return false;
  if (isJobOwner(job, viewerApplicantUserId)) return true;
  const self = getSelfApplicant(job, viewerApplicantUserId);
  if (!self) return false;
  const raw = String(self.status == null ? "" : self.status).trim();
  const sl = raw.toLowerCase();
  return sl === "accepted" || sl === "confirmed" || raw === "ACCEPTED";
}

export function isJobClosedLikeForViewer(job) {
  const st = normalizeLifecycleStatus(job);
  return st === JOB_STATUS.COMPLETED || st === JOB_STATUS.CANCELLED;
}

function countApplicantBuckets(job) {
  const list = getApplicantsArray(job);
  let accepted = 0;
  let pending = 0;
  for (const a of list) {
    const raw = a?.status;
    const s = String(raw == null ? "applied" : raw).toLowerCase();
    if (s === "confirmed" || s === "accepted") accepted += 1;
    else if (s === "rejected") continue;
    else pending += 1;
  }
  return { accepted, pending, total: list.length };
}

/** 목록 카드용 짧은 작업일 (예: 5/16(토)) */
export function formatJobCardWorkDateLine(job) {
  const k = getJobWorkDateKey(job);
  if (!k) return "";
  const parts = k.split("-").map((n) => Number(n));
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return k;
  const [y, mo, d] = parts;
  const dt = new Date(y, mo - 1, d);
  if (Number.isNaN(dt.getTime())) return k;
  const wk = ["일", "월", "화", "수", "목", "금", "토"][dt.getDay()];
  return `${mo}/${d}(${wk})`;
}

/** 지도·시트 카드 상단 배지(정산 칩 제외) */
export function getFieldOpsBadgesForMap(job) {
  if (!job) return [];
  const st = normalizeLifecycleStatus(job);
  const labelByStatus = {
    [JOB_STATUS.RECRUITING]: "팀 연결 중",
    [JOB_STATUS.FULL]: "마감",
    [JOB_STATUS.CONFIRMED]: "확정",
    [JOB_STATUS.WORKING]: "작업중",
    [JOB_STATUS.COMPLETED]: "완료",
    [JOB_STATUS.CANCELLED]: "취소",
    [JOB_STATUS.PENDING]: "확정대기",
  };
  const toneByStatus = {
    [JOB_STATUS.RECRUITING]: "recruiting",
    [JOB_STATUS.FULL]: "closed",
    [JOB_STATUS.CONFIRMED]: "closing",
    [JOB_STATUS.WORKING]: "working",
    [JOB_STATUS.COMPLETED]: "settled",
    [JOB_STATUS.CANCELLED]: "closed",
    [JOB_STATUS.PENDING]: "closing",
  };
  const out = [
    {
      key: `ops-${st}`,
      label: labelByStatus[st] || "팀 연결 중",
      tone: `state-${toneByStatus[st] || "recruiting"}`,
      emphasis: st === JOB_STATUS.WORKING,
    },
  ];
  if (isLiveHelpJob(job) && st !== JOB_STATUS.COMPLETED && st !== JOB_STATUS.CANCELLED) {
    out.unshift({
      key: "live-help",
      label: "긴급헬프",
      tone: "live-help",
      emphasis: false,
    });
  } else if (isUrgentJob(job) && st !== JOB_STATUS.COMPLETED && st !== JOB_STATUS.CANCELLED) {
    out.push({ key: "urgent", label: "긴급", tone: "state-urgent", emphasis: true });
  }
  if (isJobWorkDateToday(job) && !isLiveHelpJob(job)) {
    out.push({
      key: "today",
      label: "오늘",
      tone: "state-today-work",
      emphasis: false,
    });
  }
  return out.slice(0, 2);
}

/**
 * 지도 현장 시트용 상태 칩: primary 최대 2개 (운영 기록 톤 통일).
 * 급여·위치·시간은 본문으로 분리 — 칩은 상태·긴급만, 의미 겹치면 생략.
 */
export function getFeedPrimaryBadges(job, options = {}) {
  if (!job) return [];
  const max = Math.min(2, Math.max(1, Number(options.max) || 2));
  const st = normalizeLifecycleStatus(job);
  const live = isLiveHelpJob(job);
  const today = isJobWorkDateToday(job);
  const urgent = isUrgentJob(job);

  const labelByStatus = {
    [JOB_STATUS.RECRUITING]: "팀 연결 중",
    [JOB_STATUS.FULL]: "마감",
    [JOB_STATUS.CONFIRMED]: "확정",
    [JOB_STATUS.WORKING]: "작업중",
    [JOB_STATUS.COMPLETED]: "완료",
    [JOB_STATUS.CANCELLED]: "취소",
    [JOB_STATUS.PENDING]: "확정대기",
  };
  const toneByStatus = {
    [JOB_STATUS.RECRUITING]: "recruiting",
    [JOB_STATUS.FULL]: "closed",
    [JOB_STATUS.CONFIRMED]: "closing",
    [JOB_STATUS.WORKING]: "working",
    [JOB_STATUS.COMPLETED]: "closed",
    [JOB_STATUS.CANCELLED]: "closed",
    [JOB_STATUS.PENDING]: "closing",
  };
  const lifecycleLabel = labelByStatus[st] || "팀 연결 중";
  const lifecycleTone = `state-${toneByStatus[st] || "recruiting"}`;

  if (st === JOB_STATUS.COMPLETED) {
    return [{ key: "feed-done", label: "완료", tone: "state-closed", emphasis: false }];
  }
  if (st === JOB_STATUS.CANCELLED) {
    return [{ key: "feed-cancel", label: "취소", tone: "state-closed", emphasis: false }];
  }

  const out = [];
  if (live) {
    out.push({ key: "feed-live-help", label: "긴급헬프", tone: "live-help", emphasis: false });
    if (out.length >= max) return out.slice(0, max);
    /* 긴급헬프에 '오늘 작업'까지 붙이면 긴급 신호가 이중으로 읽혀 생략 — lifecycle로 운영 상태만 */
    out.push({
      key: `feed-st-${st}`,
      label: lifecycleLabel,
      tone: lifecycleTone,
      emphasis: st === JOB_STATUS.WORKING,
    });
    return out.slice(0, max);
  }

  if (urgent) {
    out.push({ key: "feed-urgent", label: "긴급", tone: "state-urgent", emphasis: true });
    if (out.length >= max) return out.slice(0, max);
    /* 긴급 + 오늘 작업은 정보 겹침이 커서 lifecycle 한 칩으로 통일 */
    out.push({
      key: `feed-st-${st}`,
      label: lifecycleLabel,
      tone: lifecycleTone,
      emphasis: st === JOB_STATUS.WORKING,
    });
    return out.slice(0, max);
  }

  out.push({
    key: `feed-st-${st}`,
    label: lifecycleLabel,
    tone: lifecycleTone,
    emphasis: st === JOB_STATUS.WORKING,
  });
  if (out.length < max && today) {
    out.push({ key: "feed-today", label: "오늘 작업", tone: "state-today-work", emphasis: false });
  }
  return out.slice(0, max);
}

export function deriveViewerJobState(job, viewerApplicantUserId) {
  if (!job || typeof job !== "object") {
    return {
      viewerApplicantUserId,
      hasApplied: false,
      isOwner: false,
      canApply: false,
      canEdit: false,
      selfApplicant: null,
      isClosedLike: false,
      viewerActivityTab: "none",
      applicationStatusLabel: null,
      canCancelApplicationPlaceholder: false,
      isRecruitmentClosed: false,
      recruitmentStatusLabel: "—",
      canApproveApplicants: false,
      canRejectApplicants: false,
      canCloseRecruitmentPlaceholder: false,
      canStartWorkPlaceholder: false,
      canCompleteWorkPlaceholder: false,
      applicantSlotsLabel: null,
      slotsFull: false,
      isRecruiting: false,
      isWorking: false,
      isCompleted: false,
      isCancelled: false,
      isClosed: false,
      lifecycleLabel: "—",
      lifecycleColor: "#94a3b8",
      lifecycleTone: "closed",
      compactApplicantLine: "",
      workerApplicationShortLabel: null,
      applicantAcceptedCount: 0,
      applicantPendingCount: 0,
      isTodayWork: false,
      isLiveHelp: false,
      isShortHelp: false,
      isUrgentRecruit: false,
      urgencyLevel: 0,
    };
  }
  const ownership = deriveJobOwnership(job, viewerApplicantUserId);
  const closedLike = isJobClosedLikeForViewer(job);
  let applicationStatusLabel = null;
  if (ownership.selfApplicant) {
    const s = ownership.selfApplicant.status;
    if (s === "confirmed" || s === "ACCEPTED") applicationStatusLabel = "확정";
    else if (s === "rejected" || s === "REJECTED") applicationStatusLabel = "반려";
    else applicationStatusLabel = "지원중";
  }
  const st = normalizeLifecycleStatus(job);
  const isRecruiting = st === JOB_STATUS.RECRUITING;
  const isWorking = st === JOB_STATUS.WORKING;
  const isCompleted = st === JOB_STATUS.COMPLETED;
  const isCancelled = st === JOB_STATUS.CANCELLED;
  const isClosed = isCompleted || isCancelled;
  const isRecruitmentClosed = !isRecruiting;

  const lifecycleMeta = {
    [JOB_STATUS.RECRUITING]: { label: "팀 연결 중", color: "#16a34a", tone: "recruiting" },
    [JOB_STATUS.FULL]: { label: "마감", color: "#ca8a04", tone: "closed" },
    [JOB_STATUS.CONFIRMED]: { label: "확정", color: "#ea580c", tone: "closing" },
    [JOB_STATUS.WORKING]: { label: "작업중", color: "#2563eb", tone: "working" },
    [JOB_STATUS.COMPLETED]: { label: "완료", color: "#64748b", tone: "settled" },
    [JOB_STATUS.CANCELLED]: { label: "취소", color: "#94a3b8", tone: "closed" },
    [JOB_STATUS.PENDING]: { label: "확정대기", color: "#ea580c", tone: "closing" },
  };
  const lc = lifecycleMeta[st] || lifecycleMeta[JOB_STATUS.RECRUITING];

  let recruitmentStatusLabel = "팀 연결 중";
  if (isRecruitmentClosed) {
    if (st === JOB_STATUS.COMPLETED) recruitmentStatusLabel = "작업완료";
    else if (st === JOB_STATUS.CANCELLED) recruitmentStatusLabel = "취소됨";
    else if (st === JOB_STATUS.WORKING) recruitmentStatusLabel = "작업중";
    else if (st === JOB_STATUS.CONFIRMED) recruitmentStatusLabel = "인원 확정";
    else if (st === JOB_STATUS.FULL) recruitmentStatusLabel = "팀 연결 마감";
    else recruitmentStatusLabel = "연결 종료";
  }

  const maxCap = Number(job?.maxApplicantCount);
  const curCap = Number(job?.currentApplicantCount);
  const applicantSlotsLabel =
    Number.isFinite(maxCap) && maxCap > 0
      ? `${Number.isFinite(curCap) ? curCap : applicantCount(job)}/${maxCap}`
      : null;
  const slotsFull =
    Number.isFinite(maxCap) &&
    maxCap > 0 &&
    Number.isFinite(curCap) &&
    curCap >= maxCap;

  const buckets = countApplicantBuckets(job);
  const curForLine = Number.isFinite(curCap) ? curCap : applicantCount(job);
  const compactApplicantLine =
    Number.isFinite(maxCap) && maxCap > 0
      ? `${curForLine}/${maxCap}${buckets.accepted > 0 ? `(${buckets.accepted})` : ""}`
      : `지원${applicantCount(job)}${buckets.accepted > 0 ? `(${buckets.accepted})` : ""}`;

  let workerApplicationShortLabel = null;
  if (ownership.hasApplied && !ownership.isOwner && ownership.selfApplicant) {
    const s = ownership.selfApplicant.status;
    if (s === "confirmed" || s === "ACCEPTED") workerApplicationShortLabel = "승인됨";
    else if (s === "rejected" || s === "REJECTED") workerApplicationShortLabel = "거절됨";
    else workerApplicationShortLabel = "참여 요청됨";
  }

  const todayWork = isJobWorkDateToday(job);
  const isLiveHelp = isLiveHelpJob(job);
  const isShortHelpType = isShortHelp(job);
  const isUrgentRecruit =
    isLiveHelp &&
    !closedLike &&
    (st === JOB_STATUS.RECRUITING ||
      st === JOB_STATUS.FULL ||
      st === JOB_STATUS.CONFIRMED ||
      st === JOB_STATUS.WORKING);
  const urgencyLevel = computeUrgencyLevel(job);

  const ownerOk = Boolean(ownership.isOwner) && viewerApplicantUserId != null;
  const canManageApplicantsPhase =
    st === JOB_STATUS.RECRUITING || st === JOB_STATUS.FULL || st === JOB_STATUS.CONFIRMED;
  const canApproveApplicants = ownerOk && canManageApplicantsPhase;
  const canRejectApplicants = canApproveApplicants;

  return {
    ...ownership,
    isClosedLike: closedLike,
    viewerActivityTab:
      ownership.isOwner || ownership.hasApplied ? (closedLike ? "closed" : "active") : "none",
    applicationStatusLabel,
    canCancelApplicationPlaceholder: Boolean(
      ownership.hasApplied && !ownership.isOwner && !closedLike && st !== JOB_STATUS.WORKING
    ),
    isRecruitmentClosed,
    recruitmentStatusLabel,
    canApproveApplicants,
    canRejectApplicants,
    canCloseRecruitmentPlaceholder: ownerOk && isRecruiting,
    canStartWorkPlaceholder: ownerOk && st === JOB_STATUS.CONFIRMED,
    canCompleteWorkPlaceholder: ownerOk && st === JOB_STATUS.WORKING,
    applicantSlotsLabel,
    slotsFull,
    isRecruiting,
    isWorking,
    isCompleted,
    isCancelled,
    isClosed,
    lifecycleLabel: lc.label,
    lifecycleColor: lc.color,
    lifecycleTone: lc.tone,
    compactApplicantLine,
    workerApplicationShortLabel,
    applicantAcceptedCount: buckets.accepted,
    applicantPendingCount: buckets.pending,
    isTodayWork: todayWork,
    isLiveHelp,
    isShortHelp: isShortHelpType,
    isUrgentRecruit,
    urgencyLevel,
  };
}

export function filterJobsOwnedByViewer(jobs, viewerApplicantUserId) {
  if (!Array.isArray(jobs)) return [];
  if (viewerApplicantUserId == null || !Number.isFinite(Number(viewerApplicantUserId))) return [];
  const v = Number(viewerApplicantUserId);
  return jobs.filter((job) => job && Number(job.ownerUserId) === v);
}

export function filterJobsWithViewerApplication(jobs, viewerApplicantUserId) {
  if (!Array.isArray(jobs)) return [];
  return jobs.filter((job) => job && hasSelfApplied(job, viewerApplicantUserId));
}

export function filterJobsByActivitySegment(jobs, segment) {
  if (!Array.isArray(jobs)) return [];
  if (segment === "all") return jobs.slice();
  return jobs.filter((job) => {
    const st = normalizeLifecycleStatus(job);
    if (segment === "active") {
      return st !== JOB_STATUS.COMPLETED && st !== JOB_STATUS.CANCELLED;
    }
    if (segment === "today") {
      return isJobWorkDateToday(job);
    }
    if (segment === "done") {
      return st === JOB_STATUS.COMPLETED;
    }
    if (segment === "stalled" || segment === "closed") {
      return st === JOB_STATUS.CANCELLED;
    }
    return st !== JOB_STATUS.COMPLETED && st !== JOB_STATUS.CANCELLED;
  });
}

export function getPublicRegionLine(job) {
  const raw = job?.address || job?.shortRegion || job?.shortAddress || "";
  return formatPublicAddress(raw);
}

export function getFullAddressLine(job) {
  return job?.addressDetail || job?.fullAddress || job?.address || getPublicRegionLine(job);
}

/** 확정 참여자(본인)일 때만 상세 주소 */
export function getAddressForViewer(job, viewerApplicantUserId = null) {
  const self = getSelfApplicant(job, viewerApplicantUserId);
  if (self && normalizeParticipantStatus(self.status) === "approved") return getFullAddressLine(job);
  return getPublicRegionLine(job);
}

export function createSelfApplicant(job, options = {}) {
  const { viewerApplicantUserId = null, name: nameOverride, memo: memoOverride } = options;
  const trade = normalizeJobTrade(job);
  const workerId = selfApplicantWorkerRefFromViewerId(viewerApplicantUserId);
  const numericId = parseApplicantUserNumericId({ workerId });
  const memo = String(memoOverride || "").trim().slice(0, 40);
  return {
    id: `app-self-${Date.now()}`,
    name: String(nameOverride || "김준호").trim() || "김준호",
    role: trade,
    experience: 24,
    noShow: 0,
    status: "applied",
    workerId,
    applicantUserId: numericId != null ? numericId : undefined,
    ...(memo ? { memo } : {}),
  };
}

function migrateParticipantsField(job) {
  const rawParticipants = job.participants;
  if (Array.isArray(rawParticipants) && rawParticipants.length > 0) {
    return rawParticipants.map((a, i) => normalizeApplicant(a, job, i)).filter(Boolean);
  }
  const raw = job.applicants;
  if (Array.isArray(raw)) return raw.map((a, i) => normalizeApplicant(a, job, i)).filter(Boolean);
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) {
    return Array.from({ length: n }, (_, i) => ({
      id: `legacy-${job.id}-${i + 1}`,
      name: `참여자${i + 1}`,
      role: job.trade || "조공",
      experience: 12 + i * 4,
      noShow: 0,
      status: "applied",
    }));
  }
  return [];
}

function normalizeApplicant(a, job, index) {
  if (!a || typeof a !== "object") return null;
  const memo = String(a.memo || a.applyMemo || a.message || "").trim().slice(0, 40);
  const row = {
    id: a.id != null ? a.id : `app-${job.id}-${index}`,
    name: String(a.name || "이름없음"),
    role: a.role || job.trade || "조공",
    experience: Number.isFinite(Number(a.experience)) ? Number(a.experience) : 0,
    noShow: Number.isFinite(Number(a.noShow)) ? Number(a.noShow) : 0,
    status: a.status || "applied",
    workerId: a.workerId,
    applicantUserId: a.applicantUserId,
    ...(memo ? { memo } : {}),
  };
  const parsed = parseApplicantUserNumericId(row);
  if (parsed != null) {
    row.applicantUserId = parsed;
  }
  return row;
}

const VALID_STATUS = new Set(Object.values(JOB_STATUS));
const VALID_WORK_TYPE = new Set(Object.keys(WORK_TYPE_LABEL));

function parseWorkTimeRange(workTime) {
  const text = String(workTime || "").trim();
  const match = text.match(/(\d{1,2}:\d{2})\s*~\s*(\d{1,2}:\d{2})/);
  if (!match) return { startTime: "", endTime: "" };
  return { startTime: match[1], endTime: match[2] };
}

/** localStorage / 초기 데이터 정규화 */
export function migrateJob(job) {
  if (!job || typeof job !== "object") return job;
  const participants = migrateParticipantsField(job);
  const applicants = participants;
  const address =
    (typeof job.address === "string" && job.address.trim()) ||
    job.shortRegion ||
    job.shortAddress ||
    "";
  const addressDetail =
    (typeof job.addressDetail === "string" && job.addressDetail.trim()) ||
    job.fullAddress ||
    (job.address && job.address.length > address.length ? job.address : `${address} 현장 상세주소`);
  const shortRegion = address;
  const fullAddress = addressDetail;
  const dateRaw = job.date ?? job.workDate ?? job.jobDate ?? "";
  const date = (() => {
    if (!dateRaw) return "";
    const parsed = new Date(dateRaw);
    if (Number.isNaN(parsed.getTime())) return String(dateRaw).trim();
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  })();
  const workDate = date;
  const briefing = getBriefingArray(job);
  const alerts = getAlertsArray(job);
  const craft = VALID_CRAFT.has(job.craft) ? job.craft : inferCraft(job);
  let postedAt = job.postedAt || job.createdAt;
  if (!postedAt || Number.isNaN(Date.parse(postedAt))) {
    postedAt = defaultPostedAtIso({ ...job, craft });
  }

  const idNum = Number(job.id);
  const fallbackLikes = Number.isFinite(idNum) ? (Math.abs(idNum) * 13) % 140 + 2 : 8;
  const rawImg = typeof job.listImage === "string" ? job.listImage.trim() : "";
  const listImage =
    rawImg.length > 0
      ? rawImg
      : `https://picsum.photos/seed/ildang-${job.id ?? "x"}/112/112`;
  const workerStage = getFallbackWorkerStage(job, idNum);
  const attendanceCount = toSafeInt(job.attendanceCount, Math.max(applicants.length + 2, 4 + (Math.abs(idNum || 1) % 5)));
  const activeWorkersCount = Math.min(
    attendanceCount,
    toSafeInt(job.activeWorkersCount, getFallbackWorkingCount(attendanceCount, workerStage))
  );
  const shortageCount = toSafeInt(
    job.shortageCount,
    normalizeLifecycleStatus(job) === JOB_STATUS.RECRUITING
      ? Math.max(0, 1 + (Math.abs(idNum || 1) % 2) - applicants.filter((a) => normalizeParticipantStatus(a.status) === "approved").length)
      : 0
  );
  const closingSoon =
    typeof job.closingSoon === "boolean"
      ? job.closingSoon
      : !Boolean(job.isUrgent) && (job.status === JOB_STATUS.PENDING || Math.abs(idNum || 1) % 3 === 0);
  const settlementStatus = VALID_SETTLEMENT_STATUS.has(job.settlementStatus)
    ? job.settlementStatus
    : normalizeLifecycleStatus(job) === JOB_STATUS.COMPLETED
      ? SETTLEMENT_STATUS.SETTLED
      : SETTLEMENT_STATUS.UNPAID;
  const helpTime =
    typeof job.helpTime === "string" && job.helpTime.trim()
      ? job.helpTime.trim()
      : job.workType === "shortHelp"
        ? String(job.workTime || "오후 2~5시")
        : "";
  const helpExpiresAt = parseDateOrNull(job.helpExpiresAt)?.toISOString() ||
    (Boolean(job.liveHelp) || (VALID_WORK_TYPE.has(job.workType) ? job.workType : "fullDay") === "shortHelp"
      ? new Date(new Date(postedAt).getTime() + toSafeInt(job.helpDurationMinutes, 180) * 60000).toISOString()
      : "");
  const { startTime, endTime } = parseWorkTimeRange(job.workTime);
  const normalizedTrade = normalizeJobTrade(job);
  const distanceKm = Number(job.distanceKm);
  const normalizedDistance = Number.isFinite(distanceKm) ? Math.max(0, distanceKm) : 0;

  return {
    ...job,
    status: normalizeLifecycleStatus({ ...job, status: VALID_STATUS.has(job.status) ? job.status : JOB_STATUS.RECRUITING }),
    date,
    workDate,
    address,
    addressDetail,
    shortRegion,
    shortAddress: address,
    fullAddress,
    participants,
    applicants,
    briefing,
    alerts,
    isUrgent: Boolean(job.isUrgent),
    workType: VALID_WORK_TYPE.has(job.workType) ? job.workType : "fullDay",
    craft,
    postedAt,
    listImage,
    likeCount: Number.isFinite(Number(job.likeCount)) ? Number(job.likeCount) : fallbackLikes,
    isPremium: Boolean(job.isPremium),
    beginnerOk: Boolean(job.beginnerOk),
    longTerm: Boolean(job.longTerm),
    siteKind: typeof job.siteKind === "string" ? job.siteKind.trim() : "",
    closingSoon,
    attendanceCount,
    activeWorkersCount,
    settlementStatus,
    workerStage,
    shortageCount,
    liveHelp: Boolean(job.liveHelp) || (VALID_WORK_TYPE.has(job.workType) ? job.workType : "fullDay") === "shortHelp",
    helpTime,
    helpDurationMinutes: toSafeInt(job.helpDurationMinutes, 180),
    helpExpiresAt,
    helpDescription: typeof job.helpDescription === "string" ? job.helpDescription.trim() : "",
    helpAtmosphere: typeof job.helpAtmosphere === "string" ? job.helpAtmosphere.trim() : "",
    parkingNote: typeof job.parkingNote === "string" ? job.parkingNote.trim() : "",
    mealNote: typeof job.mealNote === "string" ? job.mealNote.trim() : "",
    accessPassword: typeof job.accessPassword === "string" ? job.accessPassword.trim() : "",
    requiredItems: typeof job.requiredItems === "string" ? job.requiredItems.trim() : "",
    specialNote: typeof job.specialNote === "string" ? job.specialNote.trim() : "",
    materialNote: typeof job.materialNote === "string" ? job.materialNote.trim() : "",
    prepChecklist: Array.isArray(job.prepChecklist) ? job.prepChecklist.filter(Boolean) : [],
    bookmarked: Boolean(job.bookmarked),
    role: typeof job.role === "string" && job.role.trim() ? job.role.trim() : normalizedTrade,
    startTime: typeof job.startTime === "string" && job.startTime.trim() ? job.startTime.trim() : startTime,
    endTime: typeof job.endTime === "string" && job.endTime.trim() ? job.endTime.trim() : endTime,
    locationText:
      typeof job.locationText === "string" && job.locationText.trim()
        ? job.locationText.trim()
        : shortRegion,
    distance: Number.isFinite(Number(job.distance)) ? Number(job.distance) : normalizedDistance,
    applicantsCount: toSafeInt(job.applicantsCount, applicants.length),
    createdAt: typeof job.createdAt === "string" && job.createdAt.trim() ? job.createdAt.trim() : postedAt,
  };
}
