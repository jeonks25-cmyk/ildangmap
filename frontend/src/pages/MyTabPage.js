import React, { useCallback, useEffect, useState } from "react";
import { isDevLoginShortcutEnabled, isMockApiEnabled } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useJobs } from "../context/JobsContext";
import { useUiStore } from "../store/useUiStore";
import { useUserStore } from "../store/useUserStore";
import { runNextFieldFlowSim } from "../utils/fieldFlowSimulator";
import { useUserProfile } from "../context/UserProfileContext";
import SettingsMenuSection from "../components/settings/SettingsMenuSection";
import SettingsProfileBanner from "../components/settings/SettingsProfileBanner";
import AppTabHeader from "../components/layout/AppTabHeader";
import MapNotificationOverlay from "../components/map/MapNotificationOverlay";
import { useTabNotificationOverlay } from "../hooks/useTabNotificationOverlay";
import { SETTINGS_MENU_SECTIONS, SETTINGS_SUPPORT_EMAIL, SETTINGS_APP_VERSION } from "../constants/settingsMenuMock";
import { getDisplayNickname } from "../utils/displayNickname";
import "../styles/settings-tab-mobile.css";

export default function MyTabPage() {
  const overlay = useTabNotificationOverlay();
  const { authUser, isAuthenticated, authReady, meVerified, loginWithKakaoMock, startKakaoOAuthLogin, logout, meBootstrapLoading } =
    useAuth();
  const refreshCurrentUser = useUserStore((s) => s.refreshCurrentUser);
  const { profile } = useUserProfile();
  const { jobs, setJobs } = useJobs();
  const showAppToast = useUiStore((state) => state.showAppToast);
  const [kakaoBusy, setKakaoBusy] = useState(false);

  const displayName = getDisplayNickname(profile, authUser);
  const displayImage = profile?.profileImage || authUser?.profileImage;

  useEffect(() => {
    if (!authReady || meBootstrapLoading || isAuthenticated || isMockApiEnabled()) return;
    // /me 1회만 — meVerified 갱신 시 재호출 루프 방지 (버튼 깜빡임)
    if (meVerified) return;
    refreshCurrentUser({ waitForHydration: true }).catch(() => {
      /* bootstrap / callback에서 처리 */
    });
  }, [authReady, meBootstrapLoading, isAuthenticated, meVerified, refreshCurrentUser]);

  const onKakaoFromMy = useCallback(async () => {
    if (kakaoBusy || meBootstrapLoading) return;
    if (isMockApiEnabled()) {
      setKakaoBusy(true);
      try {
        await loginWithKakaoMock();
      } finally {
        setKakaoBusy(false);
      }
      return;
    }
    setKakaoBusy(true);
    try {
      await startKakaoOAuthLogin();
    } finally {
      setKakaoBusy(false);
    }
  }, [kakaoBusy, meBootstrapLoading, loginWithKakaoMock, startKakaoOAuthLogin]);

  const onDevMockLogin = async () => {
    if (kakaoBusy || meBootstrapLoading) return;
    setKakaoBusy(true);
    try {
      await loginWithKakaoMock();
    } finally {
      setKakaoBusy(false);
    }
  };

  const onLogout = useCallback(() => {
    logout();
    showAppToast("로그아웃했습니다.");
  }, [logout, showAppToast]);

  const handleMenuItemClick = useCallback(
    (item) => {
      switch (item.action) {
        case "email":
          window.location.href = `mailto:${SETTINGS_SUPPORT_EMAIL}`;
          break;
        case "mock":
          showAppToast(`${item.label} — 준비 중입니다.`);
          break;
        default:
          break;
      }
    },
    [showAppToast]
  );

  return (
    <div
      ref={overlay.pageRef}
      className={`my-tab-page my-tab-page--settings-hub tab-page-shell settings-desktop-hub${overlay.notificationOverlayOpen ? " my-tab-page--overlay-open" : ""}`}
    >
      <AppTabHeader
        title="설정"
        onOpenNotifications={overlay.handleOpenNotificationCenter}
        unreadCount={overlay.unreadCount}
      />

      <div className="my-tab-page__body tab-page-shell__body">
        {isAuthenticated ? (
          <SettingsProfileBanner displayName={displayName} displayImage={displayImage} />
        ) : null}

        {!isAuthenticated && authReady && !meBootstrapLoading ? (
          <section className="my-tab-page__login-area" aria-label="로그인">
            <button
              type="button"
              className="my-tab-page__kakao-btn"
              onClick={onKakaoFromMy}
              disabled={kakaoBusy || meBootstrapLoading}
            >
              {kakaoBusy || meBootstrapLoading ? "연결 중…" : "카카오 로그인"}
            </button>
            {!isMockApiEnabled() && isDevLoginShortcutEnabled() ? (
              <button
                type="button"
                className="my-tab-page__dev-login-btn"
                onClick={onDevMockLogin}
                disabled={kakaoBusy || meBootstrapLoading}
              >
                개발용 로그인 (Mock)
              </button>
            ) : null}
          </section>
        ) : null}

        <div className="settings-menu-hub">
          {SETTINGS_MENU_SECTIONS.map((section) => (
            <SettingsMenuSection
              key={section.id}
              title={section.title}
              items={section.items}
              onItemClick={handleMenuItemClick}
            />
          ))}
        </div>

        {isAuthenticated ? (
          <footer className="settings-app-footer" aria-label="계정">
            <button type="button" className="settings-app-footer__logout" onClick={onLogout}>
              로그아웃
            </button>
            <p className="settings-app-footer__version">v{SETTINGS_APP_VERSION}</p>
          </footer>
        ) : null}

        {isMockApiEnabled() && isAuthenticated ? (
          <section className="my-tab-page__card my-tab-page__card--dev" aria-label="현장 흐름 mock">
            <h2 className="my-tab-page__card-title">현장 흐름 시뮬 (dev)</h2>
            <p className="my-tab-page__card-desc my-tab-page__card-desc--one">
              mock API 전용 · 긴급·연결완료·시작·종료 순환
            </p>
            <button
              type="button"
              className="my-tab-page__dev-login-btn"
              onClick={() => {
                const { jobs: next, toast } = runNextFieldFlowSim(jobs);
                setJobs(next);
                showAppToast(toast);
              }}
            >
              다음 흐름 단계
            </button>
          </section>
        ) : null}
      </div>

      <MapNotificationOverlay
        open={overlay.notificationOverlayOpen}
        mode={overlay.notificationOverlayMode}
        detailNotification={overlay.notificationOverlayDetail}
        notifications={overlay.notificationItems}
        mapContainerRef={overlay.pageRef}
        onClose={overlay.handleCloseNotificationOverlay}
        onBack={overlay.handleNotificationOverlayBack}
        onSelectNotification={overlay.handleNotificationOverlaySelect}
      />
    </div>
  );
}
