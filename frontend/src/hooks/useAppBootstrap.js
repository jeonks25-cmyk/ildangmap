import { useEffect } from "react";
import { useJobStore } from "../store/useJobStore";
import { useSettlementStore } from "../store/useSettlementStore";
import { useUserStore } from "../store/useUserStore";

let jobsBootstrapRequested = false;
let userMeBootstrapRequested = false;
let settlementBootstrapAttempted = false;
let briefingsBootstrapAttempted = false;
let extrasBootstrapAttempted = false;

const AUTH_READY_FALLBACK_MS = 4000;

function bootstrapCurrentUser() {
  if (userMeBootstrapRequested) return;
  if (typeof window !== "undefined") {
    const sp = new URLSearchParams(window.location.search);
    // AppShell이 OAuth 직후 /me 동기화·환영 토스트를 처리한다.
    if (sp.get("login") === "success") return;
  }
  userMeBootstrapRequested = true;
  useUserStore
    .getState()
    .refreshCurrentUser()
    .catch(() => {
      /* authReady·meBootstrapLoading은 store onError / rehydrate에서 처리 */
    });
}

function ensureAuthReadyFallback() {
  const { authReady, meBootstrapLoading } = useUserStore.getState();
  if (authReady && !meBootstrapLoading) return;
  useUserStore.setState({ authReady: true, meBootstrapLoading: false });
}

export default function useAppBootstrap() {
  useEffect(() => {
    let cancelHydrationListen = null;
    let authFallbackTimer = null;

    const scheduleMeBootstrap = () => {
      if (useUserStore.persist.hasHydrated()) {
        bootstrapCurrentUser();
        return undefined;
      }
      return useUserStore.persist.onFinishHydration(() => {
        bootstrapCurrentUser();
      });
    };

    cancelHydrationListen = scheduleMeBootstrap();

    authFallbackTimer = window.setTimeout(() => {
      ensureAuthReadyFallback();
      if (!userMeBootstrapRequested) {
        bootstrapCurrentUser();
      }
    }, AUTH_READY_FALLBACK_MS);

    if (!jobsBootstrapRequested) {
      jobsBootstrapRequested = true;
      useJobStore
        .getState()
        .refreshJobs()
        .catch(() => {
          /* noop */
        })
        .finally(() => {
          useJobStore.setState({ loading: false });
        });
    }

    if (!settlementBootstrapAttempted) {
      settlementBootstrapAttempted = true;
      useSettlementStore
        .getState()
        .refreshSettlementData()
        .catch(() => {
          /* noop */
        })
        .finally(() => {
          useSettlementStore.setState({ loading: false });
        });
    }

    if (!briefingsBootstrapAttempted) {
      briefingsBootstrapAttempted = true;
      useSettlementStore
        .getState()
        .refreshBriefings()
        .catch(() => {
          /* noop */
        })
        .finally(() => {
          useSettlementStore.setState({ briefingLoading: false });
        });
    }

    if (!extrasBootstrapAttempted) {
      extrasBootstrapAttempted = true;
      useUserStore
        .getState()
        .refreshUserExtras()
        .catch(() => {
          /* noop */
        })
        .finally(() => {
          useUserStore.setState({ extrasLoading: false });
        });
    }

    return () => {
      if (typeof cancelHydrationListen === "function") {
        cancelHydrationListen();
      }
      if (authFallbackTimer != null) {
        window.clearTimeout(authFallbackTimer);
      }
    };
  }, []);
}
