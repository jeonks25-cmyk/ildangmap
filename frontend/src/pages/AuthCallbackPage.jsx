import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserStore } from "../store/useUserStore";
import { useUiStore } from "../store/useUiStore";

const AUTH_CALLBACK_TIMEOUT_MS = 12000;

function authLog(step, detail) {
  if (process.env.NODE_ENV !== "development") return;
  if (detail !== undefined) {
    console.log(`[AUTH] ${step}`, detail);
  } else {
    console.log(`[AUTH] ${step}`);
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

    authLog("callback start", { login, search: location.search });

    if (login === "error") {
      useUiStore.getState().showAppToast("카카오 로그인에 실패했어요. 다시 시도해주세요.");
      navigate("/map", { replace: true });
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      authLog("callback timeout — force navigate map");
      navigate("/map", { replace: true });
    }, AUTH_CALLBACK_TIMEOUT_MS);

    (async () => {
      try {
        authLog("refreshCurrentUser begin", {
          hasHydrated: useUserStore.persist.hasHydrated(),
        });
        await refreshCurrentUser({ waitForHydration: true });
        authLog("hydration ready", {
          hasHydrated: useUserStore.persist.hasHydrated(),
        });

        let { session: sessionAfterMe } = useUserStore.getState();
        if (!sessionAfterMe?.isAuthenticated) {
          authLog("me retry — session cookie may not be ready yet");
          await new Promise((resolve) => window.setTimeout(resolve, 400));
          await refreshCurrentUser();
          sessionAfterMe = useUserStore.getState().session;
        }

        authLog("me fetched", sessionAfterMe);
      } catch (error) {
        authLog("refreshCurrentUser error", error);
        if (!cancelled) {
          useUiStore.getState().showAppToast("카카오 로그인에 실패했어요. 다시 시도해주세요.");
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

      if (session?.isAuthenticated) {
        const nick = profile?.displayNickname || session?.user?.nickname || "";
        if (nick) {
          useUiStore.getState().showAppToast(`환영합니다, ${nick}님`);
        } else if (profile?.nicknameSetupRequired) {
          useUiStore.getState().showAppToast("활동명을 설정해 주세요");
        } else {
          useUiStore.getState().showAppToast("환영합니다");
        }
      } else {
        useUiStore.getState().showAppToast("카카오 로그인에 실패했어요. 다시 시도해주세요.");
      }

      authLog("navigate map");
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
