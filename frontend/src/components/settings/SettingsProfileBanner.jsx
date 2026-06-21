import React, { memo } from "react";
import { useNavigate } from "react-router-dom";

/** 로그인 후 닉네임·프로필 사진 간단 표시 — 탭 시 프로필 수정 */
const SettingsProfileBanner = memo(function SettingsProfileBanner({ displayName, displayImage }) {
  const navigate = useNavigate();
  const initial = (displayName || "현").slice(0, 1);

  return (
    <button
      type="button"
      className="settings-profile-banner settings-profile-banner--action"
      aria-label="내 프로필 수정"
      onClick={() => navigate("/settings/profile")}
    >
      {displayImage ? (
        <img className="settings-profile-banner__avatar" src={displayImage} alt="" />
      ) : (
        <span className="settings-profile-banner__avatar settings-profile-banner__avatar--fallback" aria-hidden="true">
          {initial}
        </span>
      )}
      <span className="settings-profile-banner__main">
        <strong className="settings-profile-banner__name">{displayName || "게스트"}</strong>
        <span className="settings-profile-banner__hint">프로필 수정</span>
      </span>
      <span className="settings-profile-banner__chev" aria-hidden="true">
        ›
      </span>
    </button>
  );
});

export default SettingsProfileBanner;
