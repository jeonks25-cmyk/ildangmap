import React, { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import useAppBootstrap from "../../hooks/useAppBootstrap";
import useInviteReferralSync from "../../hooks/useInviteReferralSync";
import { useUserStore } from "../../store/useUserStore";
import { useUiStore } from "../../store/useUiStore";
import MainTabBar from "../navigation/MainTabBar";
import NicknameSetupGate from "../onboarding/NicknameSetupGate";
import LoginPromptSheet from "../auth/LoginPromptSheet";
import AppToast from "../ui/AppToast";
import PwaInstallBanner from "../pwa/PwaInstallBanner";
import { authDiag, authDiagStoreSnapshot } from "../../utils/authDiag";
import { logIldangmapSessionCookie } from "../../utils/sessionBootstrapFlow";

export default function AppShell() {
  useAppBootstrap();
  useInviteReferralSync();

  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const authReady = useUserStore((state) => state.authReady);
  const nicknameSetupRequired = useUserStore((state) => Boolean(state.profile?.nicknameSetupRequired));
  const refreshCurrentUser = useUserStore((state) => state.refreshCurrentUser);
  const nicknameGateVisible = authReady && isAuthenticated && nicknameSetupRequired;
  const hideNavForChatRoom = /^\/chat\/[^/]+/.test(location.pathname);
  const hideNavForNotifDetail = /^\/notifications\/.+/.test(location.pathname);
  const hideNavForFieldDetail = /^\/schedule\/field\/.+/.test(location.pathname);
  const hideBottomNav = hideNavForChatRoom || hideNavForNotifDetail || hideNavForFieldDetail || nicknameGateVisible;
  const shellClass = "daangn-shell daangn-shell--oyaji daangn-shell--responsive";

  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    if (sp.get("login") !== "success") return;

    const bootstrapToken = sp.get("bt");
    if (bootstrapToken) {
      authDiag("AppShell login=success — bt ignored (bootstrap는 AuthCallback 전용)", {
        pathname: location.pathname,
      });
    }

    let cancelled = false;
    (async () => {
      authDiag("AppShell login=success handler start", {
        pathname: location.pathname,
        hasBt: Boolean(bootstrapToken),
        note: "bootstrap 미호출 — /auth/callback에서만 수행",
      });
      logIldangmapSessionCookie("AppShell login=success");

      try {
        await refreshCurrentUser({ waitForHydration: true, force: true });
      } catch (error) {
        authDiag("AppShell login=success refresh error", { message: error?.message });
      }

      if (cancelled) return;

      const { session, profile } = useUserStore.getState();
      authDiagStoreSnapshot(useUserStore.getState(), "AppShell after login=success refresh");

      const nick = profile?.displayNickname || session?.user?.nickname || "";
      if (nick) {
        useUiStore.getState().showAppToast(`환영합니다, ${nick}님`);
      } else if (profile?.nicknameSetupRequired) {
        useUiStore.getState().showAppToast("활동명을 설정해 주세요");
      } else if (session?.isAuthenticated) {
        useUiStore.getState().showAppToast("환영합니다");
      }

      navigate({ pathname: location.pathname, search: "" }, { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search, navigate, refreshCurrentUser]);

  return (
    <div className={shellClass}>
      <main className="daangn-shell__main">
        <Outlet />
      </main>
      {hideBottomNav ? null : <MainTabBar />}
      <PwaInstallBanner hasBottomNav={!hideBottomNav} />
      <AppToast />
      <LoginPromptSheet />
      {nicknameGateVisible ? <NicknameSetupGate /> : null}
    </div>
  );
}
