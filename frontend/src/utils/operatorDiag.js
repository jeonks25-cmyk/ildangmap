/**
 * 운영자 진단 — 메모리 전용 (localStorage 미사용).
 * schedulePersistTrace / bootstrap 성공 시 이벤트를 누적한다.
 */

const MAX_PHASE_LOG = 24;

const diagState = {
  lastBootstrapOkAt: null,
  lastBootstrapSource: null,
  lastGetSchedules: null,
  lastSaveAttempt: null,
  phaseLog: [],
};

function nowIso() {
  return new Date().toISOString();
}

function pushPhaseLog(entry) {
  diagState.phaseLog = [entry, ...diagState.phaseLog].slice(0, MAX_PHASE_LOG);
}

/** @param {"PUT"|"GET"} method */
export function formatApiFailureLabel({ method = "PUT", httpStatus, code, message } = {}) {
  const verb = String(method).toUpperCase() === "GET" ? "GET" : "PUT";
  const status = httpStatus != null && httpStatus !== "" ? Number(httpStatus) : null;
  const normalizedCode = code ? String(code) : "";

  if (
    normalizedCode === "SESSION_REQUIRED" ||
    normalizedCode === "no_server_session" ||
    (status === 401 && /session|로그인/i.test(String(message || "")))
  ) {
    return `${verb} 실패 (Session Missing)`;
  }
  if (status === 302 || status === 301) {
    return `${verb} 실패 (302 OAuth Redirect)`;
  }
  if (status === 401) {
    return `${verb} 실패 (401 Unauthorized)`;
  }
  if (status === 403) {
    return `${verb} 실패 (403 Forbidden)`;
  }
  if (
    status === 0 ||
    normalizedCode === "NETWORK_ERROR" ||
    /network|연결|fetch/i.test(String(message || ""))
  ) {
    return `${verb} 실패 (Network Error)`;
  }
  if (status != null && !Number.isNaN(status)) {
    return `${verb} 실패 (HTTP ${status})`;
  }
  if (normalizedCode) {
    return `${verb} 실패 (${normalizedCode})`;
  }
  return `${verb} 실패`;
}

function mapSyncReasonToCode(reason) {
  if (reason === "no_server_session") return "SESSION_REQUIRED";
  return reason ?? null;
}

function findLastPhase(phases, names) {
  if (!Array.isArray(phases)) return null;
  const set = new Set(names);
  for (let i = phases.length - 1; i >= 0; i -= 1) {
    if (set.has(phases[i]?.phase)) return phases[i];
  }
  return null;
}

/** @param {string} phase */
export function recordOperatorPersistEvent(phase, detail = {}) {
  const at = nowIso();
  const entry = { at, phase, ...detail };
  pushPhaseLog(entry);

  if (phase === "SAVE_START") {
    diagState.lastSaveAttempt = {
      startedAt: at,
      finishedAt: null,
      phases: [entry],
      httpStatus: null,
      scheduleCount: null,
      saveSuccess: null,
      syncReason: null,
      failureCode: null,
      failureLabel: null,
    };
    return;
  }

  const attempt = diagState.lastSaveAttempt;
  if (!attempt) return;

  const tracked = new Set([
    "SAVE_MEMORY_OK",
    "SESSION_VERIFY_START",
    "SESSION_VERIFY_OK",
    "SESSION_VERIFY_FAIL",
    "SYNC_START",
    "SYNC_PUT",
    "SYNC_SKIP",
    "SYNC_OK",
    "SYNC_FAIL",
    "PUT_START",
    "PUT_OK",
    "PUT_FAIL",
    "SYNC_SERVER_OK",
    "SYNC_SERVER_FAIL",
    "SAVE_SYNC_DONE",
  ]);

  if (tracked.has(phase)) {
    attempt.phases.push(entry);
  }

  if (phase === "PUT_OK") {
    attempt.httpStatus = detail.httpStatus ?? 200;
    attempt.scheduleCount = detail.scheduleCount ?? attempt.scheduleCount;
    attempt.saveSuccess = detail.saveSuccess ?? true;
    attempt.failureCode = null;
    attempt.failureLabel = null;
  }
  if (phase === "PUT_FAIL" || phase === "SYNC_SERVER_FAIL") {
    const httpStatus = detail.httpStatus ?? detail.status ?? null;
    const code = detail.code ?? null;
    attempt.httpStatus = httpStatus;
    attempt.scheduleCount = detail.scheduleCount ?? attempt.scheduleCount;
    attempt.saveSuccess = false;
    attempt.failureCode = code;
    attempt.failureLabel = formatApiFailureLabel({
      method: "PUT",
      httpStatus,
      code,
      message: detail.message,
    });
  }
  if (phase === "SESSION_VERIFY_FAIL") {
    attempt.saveSuccess = false;
    attempt.failureCode = "SESSION_REQUIRED";
    attempt.failureLabel = formatApiFailureLabel({
      method: "PUT",
      code: "SESSION_REQUIRED",
      message: detail.reason,
    });
  }
  if (phase === "SYNC_SKIP" && detail.reason === "no_server_session") {
    attempt.saveSuccess = false;
    attempt.syncReason = detail.reason;
    attempt.failureCode = "SESSION_REQUIRED";
    attempt.failureLabel = formatApiFailureLabel({
      method: "PUT",
      code: "no_server_session",
    });
  }
  if (phase === "SAVE_SYNC_DONE") {
    attempt.saveSuccess = detail.saveSuccess ?? attempt.saveSuccess;
    attempt.syncReason = detail.syncReason ?? attempt.syncReason;
    attempt.finishedAt = at;
    if (attempt.saveSuccess === false && detail.syncReason && !attempt.failureCode) {
      attempt.failureCode = mapSyncReasonToCode(detail.syncReason);
      if (!attempt.failureLabel) {
        attempt.failureLabel = formatApiFailureLabel({
          method: "PUT",
          code: attempt.failureCode,
          httpStatus: attempt.httpStatus,
        });
      }
    }
  }
}

export function recordOperatorGetSchedules({
  ok,
  scheduleCount,
  status,
  message,
  code,
  source = "api",
}) {
  const failureLabel = ok
    ? null
    : formatApiFailureLabel({
        method: "GET",
        httpStatus: status,
        code,
        message,
      });
  diagState.lastGetSchedules = {
    at: nowIso(),
    ok: Boolean(ok),
    scheduleCount: scheduleCount ?? 0,
    status: status ?? null,
    message: message ?? null,
    code: code ?? null,
    failureLabel,
    source,
  };
}

export function recordOperatorBootstrapOk({ source = "unknown" } = {}) {
  diagState.lastBootstrapOkAt = nowIso();
  diagState.lastBootstrapSource = source;
}

export function getOperatorDiagSnapshot() {
  return {
    lastBootstrapOkAt: diagState.lastBootstrapOkAt,
    lastBootstrapSource: diagState.lastBootstrapSource,
    lastGetSchedules: diagState.lastGetSchedules
      ? { ...diagState.lastGetSchedules }
      : null,
    lastSaveAttempt: diagState.lastSaveAttempt
      ? {
          ...diagState.lastSaveAttempt,
          phases: [...diagState.lastSaveAttempt.phases],
        }
      : null,
    phaseLog: [...diagState.phaseLog],
  };
}

export function computeOperatorDiagVerdict({ zustandAuthenticated, serverUserId, lastSave, lastGet }) {
  const savePhases = lastSave?.phases?.map((p) => p.phase) ?? [];

  if (savePhases.includes("PUT_FAIL") || savePhases.includes("SYNC_SERVER_FAIL")) {
    return "PUT 실패";
  }
  if (savePhases.includes("SESSION_VERIFY_FAIL") || savePhases.includes("SYNC_SKIP")) {
    return "세션 없음";
  }
  if (zustandAuthenticated && !serverUserId) {
    return "세션 없음";
  }
  if (!serverUserId && savePhases.includes("SAVE_START")) {
    return "세션 없음";
  }
  if (lastGet && lastGet.ok === false) {
    return "GET 실패";
  }
  if (savePhases.includes("PUT_OK") && lastSave?.saveSuccess !== false) {
    return "서버 저장 정상";
  }
  if (serverUserId && lastGet?.ok && (lastGet.scheduleCount ?? 0) >= 0 && savePhases.includes("PUT_OK")) {
    return "서버 저장 정상";
  }
  return "대기 중";
}

/** @returns {"ok"|"warn"|"fail"} */
export function resolveOperatorDiagTone(verdict) {
  if (verdict === "서버 저장 정상") return "ok";
  if (verdict === "대기 중") return "warn";
  return "fail";
}

export function resolveLastApiCause({ lastSave, lastGet, meError }) {
  if (lastSave?.failureLabel) return lastSave.failureLabel;

  const putFail = findLastPhase(lastSave?.phases, ["PUT_FAIL", "SYNC_SERVER_FAIL"]);
  if (putFail) {
    return formatApiFailureLabel({
      method: "PUT",
      httpStatus: putFail.httpStatus ?? putFail.status,
      code: putFail.code,
      message: putFail.message,
    });
  }

  if (findLastPhase(lastSave?.phases, ["SESSION_VERIFY_FAIL", "SYNC_SKIP"])) {
    return formatApiFailureLabel({ method: "PUT", code: "SESSION_REQUIRED" });
  }

  if (lastGet?.failureLabel) return lastGet.failureLabel;

  if (meError) {
    return formatApiFailureLabel({ method: "GET", message: meError });
  }

  return null;
}

export function buildSaveStatusSummary(lastSave) {
  if (!lastSave?.phases?.length) {
    return {
      outcome: null,
      lines: [{ key: "마지막 저장", value: "—" }],
    };
  }

  const putOk = findLastPhase(lastSave.phases, ["PUT_OK"]);
  const succeeded =
    lastSave.saveSuccess === true ||
    (putOk != null && lastSave.saveSuccess !== false);

  const savedAt = lastSave.finishedAt || putOk?.at || lastSave.startedAt;
  const scheduleCount =
    lastSave.scheduleCount ?? putOk?.scheduleCount ?? null;

  if (succeeded) {
    return {
      outcome: "success",
      lines: [
        { key: "마지막 저장", value: "성공" },
        { key: "저장 시각", value: formatDiagTimestamp(savedAt) },
        { key: "HTTP", value: String(lastSave.httpStatus ?? putOk?.httpStatus ?? 200) },
        {
          key: "schedules",
          value: scheduleCount != null ? `${scheduleCount}건` : "—",
        },
      ],
    };
  }

  const failureCode =
    lastSave.failureCode ||
    mapSyncReasonToCode(lastSave.syncReason) ||
    findLastPhase(lastSave.phases, ["PUT_FAIL"])?.code ||
    "UNKNOWN";

  return {
    outcome: "failure",
    lines: [
      { key: "마지막 저장", value: "실패" },
      { key: "원인", value: failureCode },
      {
        key: "HTTP",
        value: lastSave.httpStatus != null ? String(lastSave.httpStatus) : "—",
      },
      ...(scheduleCount != null
        ? [{ key: "schedules", value: `${scheduleCount}건` }]
        : []),
    ],
  };
}

export function formatDiagTimestamp(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("ko-KR", { hour12: false });
  } catch {
    return iso;
  }
}
