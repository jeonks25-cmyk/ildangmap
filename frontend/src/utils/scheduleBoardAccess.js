import { createApiError } from "../api/client";
import { useSettlementStore } from "../store/useSettlementStore";
import { useUserStore } from "../store/useUserStore";
import { loadStoredJobs } from "./jobsStorage";
import { canAccessJobBriefing, migrateJob } from "./jobModel";
import { loadStoredSchedules } from "./scheduleModel";
import { resolveScheduleBriefingId } from "./scheduleFieldOpsStorage";
import { isDemoMode } from "./demoMode";

export const BOARD_ACCESS_ROLE = {
  OWNER: "owner",
  ACCEPTED: "accepted",
  PENDING: "pending",
  NONE: "none",
};

/** 로그인 사용자 ID (applicantUserId → session.user.id) */
export function resolveViewerUserId(userSlice) {
  if (!userSlice || typeof userSlice !== "object") return null;
  const { session, profile } = userSlice;
  if (!session || session.isAuthenticated !== true) return null;
  const fromProfile = Number(profile?.applicantUserId ?? profile?.userId ?? profile?.id);
  if (Number.isFinite(fromProfile) && fromProfile > 0) return fromProfile;
  const fromSession = Number(session?.user?.id);
  if (Number.isFinite(fromSession) && fromSession > 0) return fromSession;
  return null;
}

export function createScheduleBriefingId() {
  if (typeof window !== "undefined" && window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `br-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isLegacySyntheticBriefingId(briefingId) {
  const bid = String(briefingId || "").trim();
  return bid.startsWith("briefing-sched-");
}

/** briefingId 없거나 legacy synthetic 이면 UUID 발급 */
export function ensureScheduleBriefingIdValue(schedule) {
  const existing = String(schedule?.briefingId || "").trim();
  if (existing && !isLegacySyntheticBriefingId(existing)) return existing;
  return createScheduleBriefingId();
}

function getScheduleList() {
  const fromStore = useSettlementStore.getState().schedules;
  if (Array.isArray(fromStore) && fromStore.length) return fromStore;
  return loadStoredSchedules();
}

export function findSchedulesByBriefingId(briefingId, scheduleIdHint) {
  const bid = String(briefingId || "").trim();
  const list = getScheduleList().filter(Boolean);

  if (scheduleIdHint) {
    const direct = list.filter((s) => String(s.id) === String(scheduleIdHint));
    if (direct.length) return direct;
  }

  if (!bid) return [];

  const byStored = list.filter((s) => String(s.briefingId || "").trim() === bid);
  if (byStored.length) return byStored;

  if (isLegacySyntheticBriefingId(bid)) {
    const sid = bid.slice("briefing-sched-".length);
    const byScheduleId = list.filter((s) => String(s.id) === sid);
    if (byScheduleId.length) return byScheduleId;
  }

  return list.filter((s) => resolveScheduleBriefingId(s) === bid);
}

export function pickCanonicalSchedule(matches) {
  if (!Array.isArray(matches) || !matches.length) return null;
  const nonJoin = matches.filter((s) => !s.joinedFromScheduleId);
  const withOwner = nonJoin.find((s) => s.createdByUserId != null) || nonJoin[0];
  return withOwner || matches[0];
}

function inviteStatus(inv) {
  return String(inv?.status || "pending").toLowerCase();
}

/**
 * @returns {{ canRead: boolean, canWrite: boolean, role: string, viewerId: number|null, schedule: object|null }}
 */
export function getScheduleBoardAccess({ briefingId, scheduleId, schedule: scheduleHint } = {}) {
  if (isDemoMode()) {
    return { canRead: true, canWrite: true, role: BOARD_ACCESS_ROLE.OWNER, viewerId: 1, schedule: scheduleHint || null };
  }

  const viewerId = resolveViewerUserId(useUserStore.getState());
  if (viewerId == null) {
    return { canRead: false, canWrite: false, role: BOARD_ACCESS_ROLE.NONE, viewerId: null, schedule: null };
  }

  let schedule = scheduleHint || null;
  if (!schedule) {
    const matches = findSchedulesByBriefingId(briefingId, scheduleId);
    schedule = pickCanonicalSchedule(matches);
  }

  if (!schedule) {
    return { canRead: false, canWrite: false, role: BOARD_ACCESS_ROLE.NONE, viewerId, schedule: null };
  }

  const ownerId = Number(schedule.createdByUserId);
  const viewer = Number(viewerId);

  if (!Number.isFinite(ownerId) || ownerId <= 0) {
    return { canRead: true, canWrite: true, role: BOARD_ACCESS_ROLE.OWNER, viewerId: viewer, schedule };
  }

  if (ownerId === viewer) {
    return { canRead: true, canWrite: true, role: BOARD_ACCESS_ROLE.OWNER, viewerId: viewer, schedule };
  }

  if (Number(schedule.acceptedParticipantUserId) === viewer) {
    return { canRead: true, canWrite: true, role: BOARD_ACCESS_ROLE.ACCEPTED, viewerId: viewer, schedule };
  }

  const invites = Array.isArray(schedule.scheduleInvites) ? schedule.scheduleInvites : [];
  let sawPending = false;
  for (const inv of invites) {
    if (Number(inv?.userId) !== viewer) continue;
    const st = inviteStatus(inv);
    if (st === "accepted" || st === "confirmed") {
      return { canRead: true, canWrite: true, role: BOARD_ACCESS_ROLE.ACCEPTED, viewerId: viewer, schedule };
    }
    if (st === "pending") sawPending = true;
  }

  if (sawPending) {
    return { canRead: true, canWrite: false, role: BOARD_ACCESS_ROLE.PENDING, viewerId: viewer, schedule };
  }

  if (schedule.jobId != null) {
    const jobs = loadStoredJobs().map(migrateJob);
    const job = jobs.find((j) => j && Number(j.id) === Number(schedule.jobId));
    if (job && canAccessJobBriefing(job, viewer)) {
      return { canRead: true, canWrite: true, role: BOARD_ACCESS_ROLE.ACCEPTED, viewerId: viewer, schedule };
    }
  }

  return { canRead: false, canWrite: false, role: BOARD_ACCESS_ROLE.NONE, viewerId: viewer, schedule };
}

export function boardAccessErrorMessage(access, { forWrite = false } = {}) {
  if (access.viewerId == null) return "로그인이 필요합니다.";
  if (!access.schedule) return "일정을 찾을 수 없습니다.";
  if (forWrite && access.role === BOARD_ACCESS_ROLE.PENDING) {
    return "초대 수락 후 글을 작성할 수 있습니다.";
  }
  if (forWrite && !access.canWrite) return "이 일정에 접근 권한이 없습니다.";
  if (!access.canRead) return "이 일정에 접근 권한이 없습니다.";
  return "요청을 처리할 수 없습니다.";
}

export function assertScheduleBoardRead({ briefingId, scheduleId, schedule } = {}) {
  const access = getScheduleBoardAccess({ briefingId, scheduleId, schedule });
  if (!access.canRead) {
    const status = access.viewerId == null ? 401 : access.schedule ? 403 : 404;
    throw createApiError(boardAccessErrorMessage(access, { forWrite: false }), status);
  }
  return access;
}

export function assertScheduleBoardWrite({ briefingId, scheduleId, schedule } = {}) {
  const access = getScheduleBoardAccess({ briefingId, scheduleId, schedule });
  if (access.viewerId == null) {
    throw createApiError("로그인이 필요합니다.", 401);
  }
  if (!access.schedule) {
    throw createApiError("일정을 찾을 수 없습니다.", 404);
  }
  if (!access.canWrite) {
    const status = access.role === BOARD_ACCESS_ROLE.PENDING ? 403 : 403;
    throw createApiError(boardAccessErrorMessage(access, { forWrite: true }), status);
  }
  return access;
}

/** API/JS 오류 → 사용자 메시지 */
export function mapBoardApiErrorMessage(error, fallback = "저장 중 오류가 발생했습니다.") {
  const msg = String(error?.message || "").trim();
  if (msg) {
    if (/로그인/.test(msg)) return "로그인이 필요합니다.";
    if (/접근 권한|접근할 수 없/.test(msg)) return "이 일정에 접근 권한이 없습니다.";
    if (/일정을 찾을 수 없/.test(msg)) return "일정을 찾을 수 없습니다.";
    if (/이미지.*크|용량/.test(msg)) return "이미지 용량이 너무 큽니다.";
    if (/초대 수락/.test(msg)) return msg;
    if (/입력/.test(msg)) return msg;
    return msg;
  }
  const status = Number(error?.status);
  if (status === 401) return "로그인이 필요합니다.";
  if (status === 403) return "이 일정에 접근 권한이 없습니다.";
  if (status === 404) return "일정을 찾을 수 없습니다.";
  if (status === 400) return fallback;
  return fallback;
}
