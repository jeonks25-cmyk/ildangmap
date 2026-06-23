import { extractMePayload, getMe } from "../api/userApi";
import { isSchedulesBootstrapInFlight, useSettlementStore } from "../store/useSettlementStore";
import { scheduleDiag, schedulePersistTrace, scheduleZeroPutProbe } from "./scheduleSyncDiag";

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/**
 * Zustand isAuthenticated와 무관하게 GET /api/users/me 로 서버 세션을 확인한다.
 * @returns {Promise<{ ok: boolean, userId?: string, reason?: string, error?: unknown }>}
 */
async function verifyServerSessionForScheduleSync(source) {
  schedulePersistTrace("SESSION_VERIFY_START", { source });
  try {
    const raw = await getMe();
    const me = extractMePayload(raw);
    const userId = me?.id ?? me?.userId ?? null;
    if (userId != null && userId !== "") {
      const uid = String(userId);
      schedulePersistTrace("SESSION_VERIFY_OK", { source, userId: uid });
      return { ok: true, userId: uid };
    }
    schedulePersistTrace("SESSION_VERIFY_FAIL", {
      source,
      reason: "no_data_id",
      saveSuccess: false,
    });
    return { ok: false, reason: "no_server_session" };
  } catch (error) {
    schedulePersistTrace("SESSION_VERIFY_FAIL", {
      source,
      reason: "get_me_error",
      saveSuccess: false,
      message: error?.message,
      status: error?.status,
      code: error?.code,
    });
    return { ok: false, reason: "no_server_session", error };
  }
}

function bindSchedulesSyncContextForServerUser(userId) {
  if (!userId) return;
  const state = useSettlementStore.getState();
  if (state.schedulesUserId !== userId) {
    useSettlementStore.setState({ schedulesUserId: userId });
    scheduleDiag("bind sync context (server session, userId only)", { userId });
  }
}

/**
 * 서버 일정 동기화 — UI 완료와 분리. 실패해도 throw 하지 않음.
 * PUT 전에 GET /api/users/me 로 서버 세션(data.id)을 확인한다.
 * @returns {Promise<{ ok: boolean, reason?: string, error?: unknown, result?: unknown, serverUserId?: string }>}
 */
export async function trySyncSchedulesToServer({ source = "unknown", retryOnSession = true } = {}) {
  const storeState = useSettlementStore.getState();
  const scheduleCount = storeState.schedules?.length ?? 0;

  scheduleZeroPutProbe("TRY_SYNC_ENTER", {
    syncReason: source,
    debounceSource: source,
    schedulesLoaded: storeState.schedulesLoaded,
    scheduleCount,
    userId: storeState.schedulesUserId,
  });

  if (isSchedulesBootstrapInFlight()) {
    schedulePersistTrace("SYNC_SKIP", {
      source,
      reason: "bootstrap_in_progress",
      scheduleCount,
      saveSuccess: false,
    });
    return { ok: false, reason: "bootstrap_in_progress" };
  }
  if (!storeState.schedulesLoaded) {
    schedulePersistTrace("SYNC_SKIP", {
      source,
      reason: "not_bootstrapped",
      scheduleCount,
      saveSuccess: false,
    });
    return { ok: false, reason: "not_bootstrapped" };
  }

  const sessionVerify = await verifyServerSessionForScheduleSync(source);
  if (!sessionVerify.ok) {
    schedulePersistTrace("SYNC_SKIP", {
      source,
      reason: "no_server_session",
      scheduleCount,
      saveSuccess: false,
    });
    return { ok: false, reason: "no_server_session" };
  }

  const serverUserId = sessionVerify.userId;
  bindSchedulesSyncContextForServerUser(serverUserId);

  schedulePersistTrace("SYNC_START", {
    source,
    userId: serverUserId,
    scheduleCount,
    serverSessionVerified: true,
  });

  const attemptSync = async (attempt) => {
    const result = await useSettlementStore.getState().flushSchedulesSync({
      syncReason: source,
      debounceSource: `trySync:${source}:attempt${attempt}`,
    });
    if (result != null) {
      schedulePersistTrace("SYNC_OK", {
        source,
        attempt,
        userId: serverUserId,
        scheduleCount: result?.schedules?.length ?? scheduleCount,
        saveSuccess: true,
      });
      scheduleDiag("trySync OK", { scheduleCount: result?.schedules?.length ?? 0, attempt, source });
      return { ok: true, result, serverUserId };
    }
    return null;
  };

  try {
    let outcome = await attemptSync(1);
    if (outcome) return outcome;

    if (retryOnSession) {
      schedulePersistTrace("SYNC_RETRY", { source, reason: "first_attempt_null" });
      await sleep(400);
      outcome = await attemptSync(2);
      if (outcome) return outcome;
    }

    schedulePersistTrace("SYNC_FAIL", {
      source,
      userId: serverUserId,
      scheduleCount,
      saveSuccess: false,
      reason: "put_no_result",
    });
    scheduleDiag("trySync failed after retry", { source });
    return { ok: false, reason: "put_failed", serverUserId };
  } catch (error) {
    const isSessionError = error?.status === 401 || error?.code === "SESSION_REQUIRED";
    schedulePersistTrace("SYNC_FAIL", {
      source,
      userId: serverUserId,
      scheduleCount,
      saveSuccess: false,
      message: error?.message,
      status: error?.status,
      code: error?.code,
    });
    scheduleDiag("trySync error", { message: error?.message, status: error?.status, code: error?.code, source });

    if (retryOnSession && isSessionError) {
      schedulePersistTrace("SYNC_RETRY", { source, reason: "session_error" });
      await sleep(500);
      try {
        const retryResult = await attemptSync(2);
        if (retryResult) return retryResult;
      } catch (retryError) {
        schedulePersistTrace("SYNC_FAIL", {
          source,
          attempt: 2,
          saveSuccess: false,
          message: retryError?.message,
          status: retryError?.status,
          code: retryError?.code,
        });
      }
    }

    return { ok: false, reason: "put_failed", error, serverUserId };
  }
}
