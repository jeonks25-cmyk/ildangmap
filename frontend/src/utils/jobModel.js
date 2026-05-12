import { normalizeJobTrade } from "./jobTrade";

/** MVP 단일 지원자 식별 (로컬 데모) */
export const SELF_WORKER_ID = "self-worker-mvp";

export const JOB_STATUS = {
  RECRUITING: "recruiting",
  PENDING: "pending",
  CLOSED: "closed",
  COMPLETED: "completed",
};

export const STATUS_LABEL = {
  recruiting: "모집중",
  pending: "확정대기",
  closed: "모집완료",
  completed: "작업완료",
};

export const WORK_TYPE_LABEL = {
  fullDay: "종일",
  morning: "오전반",
  afternoon: "오후반",
  shortHelp: "2시간헬프",
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

export function isUrgentJob(job) {
  if (!job) return false;
  if (job.isUrgent || job.isEmergency) return true;
  const tags = Array.isArray(job.tags) ? job.tags.map(String) : [];
  if (tags.some((t) => t.includes("급구") || t.includes("긴급") || t.includes("펑크"))) return true;
  const title = String(job.title || "");
  return title.includes("급구") || title.includes("긴급") || title.includes("펑크");
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
  if (job.isPremium) return "premium";
  if (isUrgentJob(job)) return "urgent";
  if (isJobWorkDateToday(job)) return "today";
  return "normal";
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

export function getApplicantsArray(job) {
  if (!job) return [];
  const a = job.applicants;
  if (Array.isArray(a)) return a.filter(Boolean);
  return [];
}

export function applicantCount(job) {
  return getApplicantsArray(job).length;
}

export function hasSelfApplied(job) {
  return getApplicantsArray(job).some((x) => x && x.workerId === SELF_WORKER_ID);
}

export function getSelfApplicant(job) {
  return getApplicantsArray(job).find((x) => x && x.workerId === SELF_WORKER_ID) || null;
}

export function canApplyToJob(job) {
  if (!job) return false;
  const st = job.status || JOB_STATUS.RECRUITING;
  if (st !== JOB_STATUS.RECRUITING) return false;
  if (hasSelfApplied(job)) return false;
  return true;
}

export function getPublicRegionLine(job) {
  return job?.shortRegion || job?.shortAddress || job?.address || "";
}

export function getFullAddressLine(job) {
  return job?.fullAddress || job?.address || getPublicRegionLine(job);
}

/** 확정 지원자(본인)일 때만 상세 주소 */
export function getAddressForViewer(job) {
  const self = getSelfApplicant(job);
  if (self && self.status === "confirmed") return getFullAddressLine(job);
  return getPublicRegionLine(job);
}

export function createSelfApplicant(job) {
  const trade = normalizeJobTrade(job);
  return {
    id: `app-self-${Date.now()}`,
    name: "김준호",
    role: trade,
    experience: 24,
    noShow: 0,
    status: "applied",
    workerId: SELF_WORKER_ID,
  };
}

function migrateApplicantsField(job) {
  const raw = job.applicants;
  if (Array.isArray(raw)) return raw.map((a, i) => normalizeApplicant(a, job, i)).filter(Boolean);
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) {
    return Array.from({ length: n }, (_, i) => ({
      id: `legacy-${job.id}-${i + 1}`,
      name: `지원자${i + 1}`,
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
  return {
    id: a.id != null ? a.id : `app-${job.id}-${index}`,
    name: String(a.name || "이름없음"),
    role: a.role || job.trade || "조공",
    experience: Number.isFinite(Number(a.experience)) ? Number(a.experience) : 0,
    noShow: Number.isFinite(Number(a.noShow)) ? Number(a.noShow) : 0,
    status: a.status || "applied",
    workerId: a.workerId,
  };
}

const VALID_STATUS = new Set(Object.values(JOB_STATUS));
const VALID_WORK_TYPE = new Set(Object.keys(WORK_TYPE_LABEL));

/** localStorage / 초기 데이터 정규화 */
export function migrateJob(job) {
  if (!job || typeof job !== "object") return job;
  const applicants = migrateApplicantsField(job);
  const shortRegion =
    job.shortRegion || job.shortAddress || job.address || "";
  const fullAddress =
    job.fullAddress ||
    (job.address && job.address.length > shortRegion.length ? job.address : `${shortRegion} 현장 상세주소`);
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

  return {
    ...job,
    status: VALID_STATUS.has(job.status) ? job.status : JOB_STATUS.RECRUITING,
    applicants,
    shortRegion,
    fullAddress,
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
  };
}
