import { useSettlementStore } from "../store/useSettlementStore";
import { useUserStore } from "../store/useUserStore";
import { scheduleDiag } from "./scheduleSyncDiag";

/**
 * 서버 일정 동기화 — UI 완료와 분리. 실패해도 throw 하지 않음.
 * @returns {Promise<{ ok: boolean, reason?: string, error?: unknown }>}
 */
export async function trySyncSchedulesToServer({ showAppToast } = {}) {
  const isAuthenticated = Boolean(useUserStore.getState().session?.isAuthenticated);
  try {
    const result = await useSettlementStore.getState().syncSchedulesToServer();
    if (isAuthenticated && result == null) {
      scheduleDiag("trySync skipped — scheduling retry");
      useSettlementStore
        .getState()
        .flushSchedulesSync()
        .catch((retryError) => {
          scheduleDiag("trySync retry failed", { message: retryError?.message });
        });
      showAppToast?.("서버 저장 대기 중입니다. 로그인 상태를 확인해 주세요.");
      return { ok: false, reason: "skipped" };
    }
    scheduleDiag("trySync OK", { scheduleCount: result?.schedules?.length ?? 0 });
    return { ok: true, result };
  } catch (error) {
    scheduleDiag("trySync error", { message: error?.message, status: error?.status, code: error?.code });
    if (error?.status === 401 || error?.code === "SESSION_REQUIRED") {
      showAppToast?.("로그인이 완료되지 않았습니다. 일정은 이 기기에 저장되었습니다.");
    } else {
      showAppToast?.("서버 동기화에 실패했습니다. 일정은 이 기기에 저장되었습니다.");
    }
    useSettlementStore
      .getState()
      .flushSchedulesSync()
      .catch(() => {
        /* debounced retry best-effort */
      });
    return { ok: false, reason: "error", error };
  }
}
