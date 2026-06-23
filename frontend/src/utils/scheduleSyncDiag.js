import { recordOperatorPersistEvent } from "./operatorDiag";

/** count=0 PUT 추적 — 콘솔 필터: [SCHEDULE-ZERO-PUT] */
const ZERO_PUT_PREFIX = "[SCHEDULE-ZERO-PUT]";

/** debounce 타이머에 실어 보낼 마지막 호출 출처 (subscribe / fieldOps 등) */
let pendingDebounceSource = "unknown";

export function setScheduleDebounceSource(source) {
  pendingDebounceSource = String(source || "unknown");
}

export function getScheduleDebounceSource() {
  return pendingDebounceSource;
}

/** 호출 스택 (Error.captureStackTrace 미지원 환경 대비) */
export function captureSyncCallStack(skipFrames = 2, maxLines = 14) {
  try {
    const err = new Error();
    const lines = String(err.stack || "")
      .split("\n")
      .slice(skipFrames, skipFrames + maxLines)
      .map((line) => line.trim())
      .filter(Boolean);
    return lines.join("\n");
  } catch {
    return "";
  }
}

/**
 * count=0 PUT 직전·직후 상태 스냅샷
 * @param {string} phase
 * @param {Record<string, unknown>} detail
 */
export function scheduleZeroPutProbe(phase, detail = {}) {
  const entry = {
    at: new Date().toISOString(),
    callStack: captureSyncCallStack(3),
    debounceSource: pendingDebounceSource,
    ...detail,
  };
  const count = Number(entry.scheduleCount ?? entry["schedules.length"] ?? -1);
  if (count === 0 || phase.includes("ZERO") || phase.includes("CANDIDATE")) {
    console.warn(`${ZERO_PUT_PREFIX} ${phase}`, entry);
  } else {
    console.log(`${ZERO_PUT_PREFIX} ${phase}`, entry);
  }
  recordOperatorPersistEvent(`ZERO_PUT_${phase}`, entry);
}

/** schedulesLoaded / schedules.length 변화 추적 */
export function scheduleStateChangeTrace(field, { from, to, reason, userId, schedulesLoaded, scheduleCount } = {}) {
  scheduleZeroPutProbe("STATE_CHANGE", {
    field,
    from,
    to,
    syncReason: reason,
    userId: userId != null ? String(userId) : null,
    schedulesLoaded,
    scheduleCount: scheduleCount ?? null,
    "schedules.length": scheduleCount ?? null,
  });
}

/** 일정 저장·조회 동기화 진단 — [SCHEDULE-DIAG] 접두사로 필터 */
export function scheduleDiag(step, detail) {
  if (detail !== undefined) {
    console.log(`[SCHEDULE-DIAG] ${step}`, detail);
  } else {
    console.log(`[SCHEDULE-DIAG] ${step}`);
  }
}

/** 영속화 경로 추적 — [SCHEDULE-PERSIST] (저장·sync·로그아웃·bootstrap) */
export function schedulePersistTrace(phase, detail = {}) {
  const entry = { at: new Date().toISOString(), ...detail };
  console.log(`[SCHEDULE-PERSIST] ${phase}`, entry);
  recordOperatorPersistEvent(phase, detail);
}

export function payloadByteLength(payload) {
  try {
    if (typeof Blob !== "undefined") {
      return new Blob([JSON.stringify(payload)]).size;
    }
  } catch {
    /* fall through */
  }
  try {
    return JSON.stringify(payload).length;
  } catch {
    return 0;
  }
}

export function scheduleDiagSaveResult(schedule) {
  if (!schedule) {
    scheduleDiag("save — no schedule");
    return;
  }
  const memberIds = [
    ...(Array.isArray(schedule.scheduleInvites) ? schedule.scheduleInvites.map((iv) => iv?.userId) : []),
    ...(Array.isArray(schedule.workerAssignments) ? schedule.workerAssignments.map((w) => w?.userId) : []),
  ].filter((id) => id != null && id !== "");

  scheduleDiag("save result", {
    scheduleId: schedule.id,
    ownerId: schedule.createdByUserId ?? null,
    memberIds: [...new Set(memberIds.map(String))],
    workDate: schedule.workDate,
    title: schedule.title,
  });
}

export function scheduleDiagCalendarLoad({
  userId,
  schedulesUserId,
  schedulesLoaded,
  selectedDateKey,
  totalSchedules,
  dayEntryCount,
  siteCount,
  personalCount,
}) {
  scheduleDiag("calendar load", {
    userId: userId != null ? String(userId) : null,
    schedulesUserId: schedulesUserId != null ? String(schedulesUserId) : null,
    schedulesLoaded: Boolean(schedulesLoaded),
    selectedDateKey,
    totalSchedules,
    dayEntryCount,
    siteCount,
    personalCount,
  });
}

export function scheduleDiagCurrentUser({ userId, isAuthenticated, schedulesUserId, hasSessionCookie }) {
  scheduleDiag("currentUser", {
    userId: userId != null ? String(userId) : null,
    isAuthenticated: Boolean(isAuthenticated),
    schedulesUserId: schedulesUserId != null ? String(schedulesUserId) : null,
    hasSessionCookie: Boolean(hasSessionCookie),
  });
}
