import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserStore } from "../store/useUserStore";
import { useUiStore } from "../store/useUiStore";
import { authDiag, authDiagStoreSnapshot } from "../utils/authDiag";

const AUTH_CALLBACK_TIMEOUT_MS = 12000;
/** OAuth 직후 세션 쿠키·/me 동기화 대기 (ms) */
const OAUTH_ME_RETRY_DELAYS_MS = [0, 300, 600, 1200, 2000];

function authLog(step, detail) {
  if (process.env.NODE_ENV !== "development") return;
  if (detail !== undefined) {
    console.log(`[AUTH] ${step}`, detail);
  } else {
    console.log(`[AUTH] ${step}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function syncSessionAfterOAuth(refreshCurrentUser) {
  for (let attempt = 0; attempt < OAUTH_ME_RETRY_DELAYS_MS.length; attempt += 1) {
    if (attempt > 0) {
      await sleep(OAUTH_ME_RETRY_DELAYS_MS[attempt]);
    }
    await refreshCurrentUser({
      waitForHydration: attempt === 0,
      force: true,
    });
    const snapshot = useUserStore.getState();
    authDiag("oauth me sync attempt", {
      attempt: attempt + 1,
      isAuthenticated: snapshot.session?.isAuthenticated,
      userId: snapshot.session?.user?.id,
    });
    if (snapshot.session?.isAuthenticated) {
      return true;
    }
  }
  return false;
}

function showWelcomeToast(session, profile) {
  const nick = profile?.displayNickname || session?.user?.nickname || "";
  if (nick) {
    useUiStore.getState().showAppToast(`환영합니다, ${nick}님`);
  } else if (profile?.nicknameSetupRequired) {
    useUiStore.getState().showAppToast("활동명을 설정해 주세요");
  } else {
    useUiStore.getState().showAppToast("환영합니다");
  }
}

/**
 * Spring OAuth2 로그인 후 리다이렉트 — ?login=success|error
 * 세션 쿠키(ILDANGMAPSESSION)는 백엔드 도메인에 저장되며, /api/users/me 로 동기화한다.
 */
export default function AuthCallbackPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const refreshCurrentUser = useUserStore((s) => s.refreshCurrentUser);

  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const login = sp.get("login");
    const oauthSucceeded = login !== "error";

    console.log("login query", login);
    console.log("oauthSucceeded", oauthSucceeded);

    authLog("callback start", { login, search: location.search });
    authDiag("AuthCallback start", { login, oauthSucceeded, search: location.search });

    if (login === "error") {
      authDiag("AuthCallback toast", { reason: "login=error query" });
      useUiStore.getState().showAppToast("카카오 로그인에 실패했어요. 다시 시도해주세요.");
      navigate("/map", { replace: true });
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      authLog("callback timeout — force navigate map");
      authDiag("AuthCallback timeout navigate", { target: "/map?login=success" });
      navigate("/map?login=success", { replace: true });
    }, AUTH_CALLBACK_TIMEOUT_MS);

    (async () => {
      let synced = false;
      try {
        authLog("refreshCurrentUser begin", {
          hasHydrated: useUserStore.persist.hasHydrated(),
        });
        synced = await syncSessionAfterOAuth(refreshCurrentUser);
        authDiagStoreSnapshot(useUserStore.getState(), "AuthCallback after sync");
      } catch (error) {
        authLog("refreshCurrentUser error", error);
        authDiag("AuthCallback sync error", { message: error?.message });
        if (!cancelled && !oauthSucceeded) {
          authDiag("AuthCallback toast", { reason: "sync error without oauth success" });
          useUiStore.getState().showAppToast("카카오 로그인에 실패했어요. 다시 시도해주세요.");
        }
        if (!cancelled) {
          navigate(oauthSucceeded ? "/map?login=success" : "/map", { replace: true });
        }
        return;
      } finally {
        window.clearTimeout(timeoutId);
      }

      if (cancelled) return;

      const { session, profile, meVerified } = useUserStore.getState();
      authLog("store updated", {
        isAuthenticated: session?.isAuthenticated,
        meVerified,
        userId: session?.user?.id,
        profileId: profile?.id,
      });

      if (synced && session?.isAuthenticated) {
        authDiag("AuthCallback toast", { reason: "welcome", userId: session?.user?.id });
        showWelcomeToast(session, profile);
        authLog("navigate map");
        navigate("/map", { replace: true });
        return;
      }

      if (oauthSucceeded) {
        console.log("oauthSucceeded branch", { synced, isAuthenticated: session?.isAuthenticated });
        // OAuth는 성공했으나 /me 동기화만 지연 — 실패 토스트 대신 map에서 재시도
        authDiag("AuthCallback delegate to map", {
          reason: "oauth ok but me sync pending",
          session,
        });
        navigate("/map?login=success", { replace: true });
        return;
      }

      console.log("failure toast branch", { synced, oauthSucceeded, login, isAuthenticated: session?.isAuthenticated });
      authDiag("AuthCallback toast", {
        reason: "unauthenticated and no oauth success",
        session,
        meVerified,
      });
      useUiStore.getState().showAppToast("카카오 로그인에 실패했어요. 다시 시도해주세요.");
      navigate("/map", { replace: true });
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [location.search, navigate, refreshCurrentUser]);

  return (
    <div className="auth-callback-page" role="status" aria-live="polite">
      <p className="auth-callback-page__text">로그인 처리 중…</p>
    </div>
  );
}
