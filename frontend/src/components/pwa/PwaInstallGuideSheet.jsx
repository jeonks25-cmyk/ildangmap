import React from "react";
import { getPwaPlatform } from "../../utils/pwaInstall";

function IosSteps() {
  return (
    <ol className="pwa-install-guide__steps">
      <li>하단 <strong>공유</strong> 버튼(□↑)을 누릅니다.</li>
      <li><strong>홈 화면에 추가</strong>를 선택합니다.</li>
      <li>이름이 <strong>일당맵</strong>인지 확인 후 <strong>추가</strong>를 누릅니다.</li>
    </ol>
  );
}

function AndroidSteps() {
  return (
    <ol className="pwa-install-guide__steps">
      <li>오른쪽 위 <strong>⋮</strong> 메뉴를 누릅니다.</li>
      <li><strong>홈 화면에 추가</strong> 또는 <strong>앱 설치</strong>를 선택합니다.</li>
      <li><strong>추가</strong>를 누르면 홈 화면에 일당맵 아이콘이 생깁니다.</li>
    </ol>
  );
}

function OtherSteps() {
  return (
    <ol className="pwa-install-guide__steps">
      <li>브라우저 메뉴에서 <strong>홈 화면에 추가</strong> 또는 <strong>앱 설치</strong>를 찾아주세요.</li>
      <li>추가 후 홈 화면의 <strong>일당맵</strong> 아이콘으로 실행하면 주소창 없이 사용할 수 있습니다.</li>
    </ol>
  );
}

export default function PwaInstallGuideSheet({ open, onClose }) {
  if (!open) return null;

  const platform = getPwaPlatform();

  return (
    <div className="pwa-install-guide__backdrop" role="presentation" onClick={onClose}>
      <section
        className="pwa-install-guide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-guide-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="pwa-install-guide__head">
          <h2 id="pwa-install-guide-title">홈 화면에 추가하는 방법</h2>
          <button type="button" className="pwa-install-guide__close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </header>
        <p className="pwa-install-guide__lead">
          한 번만 추가해 두면 주소를 입력하지 않고 앱처럼 바로 실행할 수 있습니다.
        </p>
        {platform === "ios" ? <IosSteps /> : null}
        {platform === "android" ? <AndroidSteps /> : null}
        {platform === "other" ? <OtherSteps /> : null}
        <p className="pwa-install-guide__note">접속 주소: https://ildangmap.vercel.app</p>
        <button type="button" className="pwa-install-guide__ok" onClick={onClose}>
          확인
        </button>
      </section>
    </div>
  );
}
