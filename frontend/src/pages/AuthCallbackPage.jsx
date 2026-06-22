import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserStore } from "../store/useUserStore";
import { useUiStore } from "../store/useUiStore";
import { authDiag, authDiagStoreSnapshot } from "../utils/authDiag";
import {
  bootstrapSessionOnce,
  fetchMeSnapshotAfterBootstrap,
  logIldangmapSessionCookie,
} from "../utils/sessionBootstrapFlow";

const AUTH_CALLBACK_TIMEOUT_MS = 12000;
const OAUTH_ME_RETRY_DELAYS_MS = [0, 300, 600, 1200, 2000];

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
 * Spring OAuth2 로그인 후 리다이렉트 — ?login=success|error&bt=...
 * bootstrap은 이 페이지에서만 1회 수행 (AppShell에서는 호출하지 않음)
 */
export default function AuthCallbackPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const refreshCurrentUser = useUserStore((s) => s.refreshCurrentUser);

  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const login = sp.get("login");
    const bootstrapToken = sp.get("bt");
    const oauthSucceeded = login !== "error";

    console.log("[AuthCallback] login", login);
    console.log("[AuthCallback] bt", bootstrapToken ? bootstrapToken : "(missing)");

    authDiag("AuthCallback start", {
      login,
      bt: bootstrapToken ? "(present)" : "(missing)",
      oauthSucceeded,
      origin: window.location.origin,
    });

    if (login === "error") {
      useUiStore.getState().showAppToast("카카오 로그인에 실패했어요. 다시 시도해주세요.");
      navigate("/map", { replace: true });
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      authDiag("AuthCallback timeout navigate", { target: "/map?login=success" });
      navigate("/map?login=success", { replace: true });
    }, AUTH_CALLBACK_TIMEOUT_MS);

    (async () => {
      let bootstrapOk = false;
      let meSnapshot = null;

      try {
        if (bootstrapToken) {
          const bootstrapResult = await bootstrapSessionOnce(bootstrapToken, { source: "AuthCallback" });
          bootstrapOk = bootstrapResult.ok || bootstrapResult.skipped;

          logIldangmapSessionCookie("after bootstrap");

          if (bootstrapOk && !bootstrapResult.skipped) {
            const { snapshot } = await fetchMeSnapshotAfterBootstrap();
            meSnapshot = snapshot;
            if (!snapshot.authenticated) {
              console.error("[AuthCallback] bootstrap OK but /api/users/me has no data", snapshot);
              useUiStore.getState().showAppToast(
                "로그인 세션을 확인하지 못했습니다. 다시 로그인해 주세요."
              );
              if (!cancelled) {
                navigate("/map", { replace: true });
              }
              return;
            }
          } else if (!bootstrapOk) {
            console.error("[AuthCallback] bootstrap failed", bootstrapResult);
            useUiStore.getState().showAppToast("로그인 세션 생성에 실패했습니다. 다시 시도해 주세요.");
            if (!cancelled) {
              navigate("/map", { replace: true });
            }
            return;
          }
        } else {
          authDiag("session bootstrap skipped", { reason: "no bt query param" });
          logIldangmapSessionCookie("no bt param");
        }

        const synced = await syncSessionAfterOAuth(refreshCurrentUser);
        authDiagStoreSnapshot(useUserStore.getState(), "AuthCallback after sync");

        if (cancelled) return;

        const { session, profile } = useUserStore.getState();

        if (synced && session?.isAuthenticated) {
          showWelcomeToast(session, profile);
          navigate("/map", { replace: true });
          return;
        }

        if (meSnapshot?.authenticated || oauthSucceeded) {
          authDiag("AuthCallback delegate to map", {
            reason: "oauth ok — me sync pending",
            meSnapshot,
            isAuthenticated: session?.isAuthenticated,
          });
          if (!session?.isAuthenticated) {
            useUiStore.getState().showAppToast(
              "로그인 세션을 확인하지 못했습니다. 일정 저장 전 다시 로그인해 주세요."
            );
          }
          navigate("/map", { replace: true });
          return;
        }

        useUiStore.getState().showAppToast("카카오 로그인에 실패했어요. 다시 시도해주세요.");
        navigate("/map", { replace: true });
      } catch (error) {
        authDiag("AuthCallback sync error", { message: error?.message });
        if (!cancelled) {
          useUiStore.getState().showAppToast("카카오 로그인 처리 중 오류가 발생했습니다.");
          navigate("/map", { replace: true });
        }
      } finally {
        window.clearTimeout(timeoutId);
      }
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
