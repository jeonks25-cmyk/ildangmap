import React, { useEffect, useState } from "react";
import PwaInstallGuideSheet from "./PwaInstallGuideSheet";
import {
  dismissPwaInstallBannerForToday,
  isPwaStandalone,
  shouldShowPwaInstallBanner,
} from "../../utils/pwaInstall";
import "../../styles/pwa-install.css";

export default function PwaInstallBanner({ hasBottomNav = true }) {
  const [visible, setVisible] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    setVisible(shouldShowPwaInstallBanner());
  }, []);

  if (!visible || isPwaStandalone()) {
    return guideOpen ? <PwaInstallGuideSheet open onClose={() => setGuideOpen(false)} /> : null;
  }

  const handleDismiss = () => {
    dismissPwaInstallBannerForToday();
    setVisible(false);
  };

  return (
    <>
      <aside
        className={`pwa-install-banner${hasBottomNav ? "" : " pwa-install-banner--no-tab"}`}
        aria-label="홈 화면 추가 안내"
      >
        <p className="pwa-install-banner__text">📱 홈화면에 추가하면 앱처럼 사용할 수 있습니다</p>
        <div className="pwa-install-banner__actions">
          <button type="button" className="pwa-install-banner__guide" onClick={() => setGuideOpen(true)}>
            홈화면 추가 방법 보기
          </button>
          <button type="button" className="pwa-install-banner__dismiss" onClick={handleDismiss}>
            닫기
          </button>
        </div>
      </aside>
      <PwaInstallGuideSheet open={guideOpen} onClose={() => setGuideOpen(false)} />
    </>
  );
}
