import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserStore } from "../store/useUserStore";
import { useUiStore } from "../store/useUiStore";

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

    if (login === "error") {
      useUiStore.getState().showAppToast("카카오 로그인에 실패했어요. 다시 시도해주세요.");
      navigate("/map", { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await refreshCurrentUser();
      } catch {
        if (!cancelled) {
          useUiStore.getState().showAppToast("카카오 로그인에 실패했어요. 다시 시도해주세요.");
        }
        if (!cancelled) navigate("/map", { replace: true });
        return;
      }
      if (cancelled) return;

      const { session, profile } = useUserStore.getState();
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
      navigate("/map", { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [location.search, navigate, refreshCurrentUser]);

  return (
    <div className="auth-callback-page" role="status" aria-live="polite">
      <p className="auth-callback-page__text">로그인 처리 중…</p>
    </div>
  );
}
