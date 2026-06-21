import React, { memo } from "react";
import { useNavigate } from "react-router-dom";
import { useUserProfile } from "../../context/UserProfileContext";
import { getDisplayNickname } from "../../utils/displayNickname";
import { buildProfileDisplayLines } from "../../models/profileModel";

/** 인원 탭 — 내 프로필 요약 (설정과 동일 데이터) */
const ContactsSelfProfileCard = memo(function ContactsSelfProfileCard({ authUser }) {
  const navigate = useNavigate();
  const { profile, profileMeta } = useUserProfile();
  const displayName = getDisplayNickname(profile, authUser);
  const lines = buildProfileDisplayLines(profile, profileMeta);

  return (
    <button
      type="button"
      className="contacts-self-profile"
      aria-label="내 정보 관리"
      onClick={() => navigate("/settings/profile")}
    >
      <span className="contacts-self-profile__avatar" aria-hidden="true">
        {(displayName || "나").slice(0, 1)}
      </span>
      <span className="contacts-self-profile__body">
        <strong className="contacts-self-profile__name">{displayName || "내 프로필"}</strong>
        <span className="contacts-self-profile__meta">
          {lines.slice(0, 2).join(" · ") || "활동 정보를 등록해 주세요"}
        </span>
        {profileMeta?.intro ? <span className="contacts-self-profile__intro">{profileMeta.intro}</span> : null}
      </span>
      <span className="contacts-self-profile__action">관리 ›</span>
    </button>
  );
});

export default ContactsSelfProfileCard;
