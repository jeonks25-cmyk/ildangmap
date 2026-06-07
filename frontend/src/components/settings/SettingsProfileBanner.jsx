import React, { memo } from "react";

/** 로그인 후 닉네임·프로필 사진 간단 표시 */
const SettingsProfileBanner = memo(function SettingsProfileBanner({ displayName, displayImage }) {
  const initial = (displayName || "현").slice(0, 1);

  return (
    <div className="settings-profile-banner" aria-label="내 프로필">
      {displayImage ? (
        <img className="settings-profile-banner__avatar" src={displayImage} alt="" />
      ) : (
        <span className="settings-profile-banner__avatar settings-profile-banner__avatar--fallback" aria-hidden="true">
          {initial}
        </span>
      )}
      <span className="settings-profile-banner__main">
        <strong className="settings-profile-banner__name">{displayName || "게스트"}</strong>
      </span>
    </div>
  );
});

export default SettingsProfileBanner;
