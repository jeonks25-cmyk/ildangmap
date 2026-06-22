import { useSettlementStore } from "../store/useSettlementStore";
import { useUserStore } from "../store/useUserStore";
import { scheduleDiag, schedulePersistTrace } from "./scheduleSyncDiag";

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/**
 * 서버 일정 동기화 — UI 완료와 분리. 실패해도 throw 하지 않음.
 * @returns {Promise<{ ok: boolean, reason?: string, error?: unknown, result?: unknown }>}
 */
export async function trySyncSchedulesToServer({ showAppToast, source = "unknown", retryOnSession = true } = {}) {
  const session = useUserStore.getState().session;
  const profile = useUserStore.getState().profile;
  const userId = session?.user?.id ?? profile?.id ?? null;
  const isAuthenticated = Boolean(session?.isAuthenticated);
  const scheduleCount = useSettlementStore.getState().schedules?.length ?? 0;

  schedulePersistTrace("SYNC_START", {
    source,
    userId: userId != null ? String(userId) : null,
    isAuthenticated,
    scheduleCount,
  });

  const attemptSync = async (attempt) => {
    const result = await useSettlementStore.getState().flushSchedulesSync();
    if (result != null) {
      schedulePersistTrace("SYNC_OK", {
        source,
        attempt,
        userId: userId != null ? String(userId) : null,
        scheduleCount: result?.schedules?.length ?? scheduleCount,
        saveSuccess: true,
      });
      scheduleDiag("trySync OK", { scheduleCount: result?.schedules?.length ?? 0, attempt, source });
      return { ok: true, result };
    }
    return null;
  };

  try {
    let outcome = await attemptSync(1);
    if (outcome) return outcome;

    if (isAuthenticated && retryOnSession) {
      schedulePersistTrace("SYNC_RETRY", { source, reason: "first_attempt_null" });
      await sleep(400);
      outcome = await attemptSync(2);
      if (outcome) return outcome;
    }

    if (isAuthenticated) {
      schedulePersistTrace("SYNC_SKIP", {
        source,
        userId: userId != null ? String(userId) : null,
        scheduleCount,
        saveSuccess: false,
      });
      scheduleDiag("trySync skipped after retry", { source });
      showAppToast?.("서버 저장 대기 중입니다. 로그인 상태를 확인해 주세요.");
      return { ok: false, reason: "skipped" };
    }

    schedulePersistTrace("SYNC_SKIP", { source, reason: "guest", saveSuccess: false });
    return { ok: false, reason: "guest" };
  } catch (error) {
    const isSessionError = error?.status === 401 || error?.code === "SESSION_REQUIRED";
    schedulePersistTrace("SYNC_FAIL", {
      source,
      userId: userId != null ? String(userId) : null,
      scheduleCount,
      saveSuccess: false,
      message: error?.message,
      status: error?.status,
      code: error?.code,
    });
    scheduleDiag("trySync error", { message: error?.message, status: error?.status, code: error?.code, source });

    if (retryOnSession && isSessionError && isAuthenticated) {
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

    if (isSessionError) {
      showAppToast?.("로그인이 완료되지 않았습니다. 일정은 이 기기에 저장되었습니다.");
    } else {
      showAppToast?.("서버 동기화에 실패했습니다. 일정은 이 기기에 저장되었습니다.");
    }
    return { ok: false, reason: "error", error };
  }
}
