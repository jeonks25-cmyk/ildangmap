import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProfileNicknameSection, {
  canSubmitNicknameChange,
  resolveNicknameChangeError,
} from "../components/settings/ProfileNicknameSection";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../context/UserProfileContext";
import { useUserStore } from "../store/useUserStore";
import { useUiStore } from "../store/useUiStore";
import { getDisplayNickname } from "../utils/displayNickname";
import { ACTIVITY_REGIONS } from "../constants/activityRegions";
import { CRAFT_KEYS, CRAFT_LABEL } from "../utils/jobModel";
import "../styles/settings-tab-mobile.css";

const ROLE_OPTIONS = ["조공", "준기공", "기공", "오야지"];

function parseBirthYearInput(value) {
  const digits = String(value || "").replace(/[^\d]/g, "").slice(0, 4);
  if (!digits) return { text: "", number: null };
  return { text: digits, number: Number(digits) };
}

function parseDesiredPayInput(value) {
  const digits = String(value || "").replace(/[^\d]/g, "").slice(0, 3);
  if (!digits) return { text: "", number: null };
  return { text: digits, number: Number(digits) };
}

export default function ProfileEditPage() {
  const navigate = useNavigate();
  const { authUser, isAuthenticated } = useAuth();
  const { profile, profileMeta } = useUserProfile();
  const saveLocalProfileDetails = useUserStore((s) => s.saveLocalProfileDetails);
  const setProfileMeta = useUserStore((s) => s.setProfileMeta);
  const changeDisplayNickname = useUserStore((s) => s.changeDisplayNickname);
  const showAppToast = useUiStore((s) => s.showAppToast);

  const currentNickname = getDisplayNickname(profile, authUser);

  const [nicknameDraft, setNicknameDraft] = useState(currentNickname);
  const [birthYearText, setBirthYearText] = useState(profile?.birthYear ? String(profile.birthYear) : "");
  const [region, setRegion] = useState(profile?.region || "대전 서구");
  const [craft, setCraft] = useState(profile?.craft || "film");
  const [role, setRole] = useState(profile?.role || "기공");
  const [desiredPayText, setDesiredPayText] = useState(
    profile?.desiredPay != null ? String(profile.desiredPay) : ""
  );
  const [intro, setIntro] = useState(profileMeta?.intro || "");
  const [regionSheetOpen, setRegionSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState(null);

  useEffect(() => {
    setNicknameDraft(currentNickname);
    setBirthYearText(profile?.birthYear ? String(profile.birthYear) : "");
    setRegion(profile?.region || "대전 서구");
    setCraft(profile?.craft || "film");
    setRole(profile?.role || "기공");
    setDesiredPayText(profile?.desiredPay != null ? String(profile.desiredPay) : "");
    setIntro(profileMeta?.intro || "");
  }, [currentNickname, profile, profileMeta?.intro]);

  const nicknameOk = canSubmitNicknameChange({
    draft: nicknameDraft,
    currentNickname,
    canChangeNickname: profile?.canChangeNickname !== false,
    available: nicknameAvailable,
  });

  const onSave = useCallback(async () => {
    if (!isAuthenticated) {
      showAppToast("로그인 후 프로필을 수정할 수 있습니다.");
      return;
    }

    const nicknameErr = resolveNicknameChangeError({
      draft: nicknameDraft,
      currentNickname,
      canChangeNickname: profile?.canChangeNickname !== false,
      available: nicknameAvailable,
      nicknameChangeAvailableAt: profile?.nicknameChangeAvailableAt,
    });
    if (nicknameErr) {
      showAppToast(nicknameErr);
      return;
    }

    const birth = parseBirthYearInput(birthYearText);
    if (birth.text && (!birth.number || birth.number < 1940 || birth.number > 2015)) {
      showAppToast("출생년도를 확인해 주세요 (1940~2015).");
      return;
    }

    const pay = parseDesiredPayInput(desiredPayText);

    setSaving(true);
    try {
      const trimmedNick = String(nicknameDraft || "").trim();
      if (trimmedNick && trimmedNick !== currentNickname) {
        const nickResult = await changeDisplayNickname(trimmedNick);
        if (!nickResult?.ok) {
          showAppToast(nickResult?.message || "닉네임 변경에 실패했습니다.");
          return;
        }
      }

      saveLocalProfileDetails({
        birthYear: birth.number,
        region,
        residence: region,
        craft,
        role,
        trade: role,
        desiredPay: pay.number,
      });
      setProfileMeta({ intro: String(intro || "").trim(), region, craft, trade: role });

      showAppToast("프로필을 저장했습니다.");
      navigate("/settings", { replace: true });
    } catch (err) {
      showAppToast(err?.message || "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [
    isAuthenticated,
    nicknameDraft,
    currentNickname,
    profile,
    nicknameAvailable,
    birthYearText,
    desiredPayText,
    region,
    craft,
    role,
    intro,
    changeDisplayNickname,
    saveLocalProfileDetails,
    setProfileMeta,
    showAppToast,
    navigate,
  ]);

  const craftLabel = useMemo(() => CRAFT_LABEL[craft] || craft, [craft]);

  if (!isAuthenticated) {
    return (
      <div className="my-tab-page my-tab-page--profile-hub tab-page-shell">
        <header className="profile-edit-header">
          <button type="button" className="profile-edit-header__back" onClick={() => navigate("/settings")} aria-label="뒤로">
            ←
          </button>
          <h1 className="profile-edit-header__title">내 프로필</h1>
        </header>
        <div className="tab-page-shell__body">
          <p className="settings-prefs__lead">로그인 후 프로필을 수정할 수 있습니다.</p>
          <button type="button" className="settings-profile__btn settings-profile__btn--primary" onClick={() => navigate("/settings")}>
            설정으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="my-tab-page my-tab-page--profile-hub tab-page-shell">
      <header className="profile-edit-header">
        <button type="button" className="profile-edit-header__back" onClick={() => navigate("/settings")} aria-label="뒤로">
          ←
        </button>
        <h1 className="profile-edit-header__title">내 프로필</h1>
      </header>

      <div className="tab-page-shell__body profile-edit-page">
        <ProfileNicknameSection
          currentNickname={currentNickname}
          canChangeNickname={profile?.canChangeNickname !== false}
          nicknameChangeAvailableAt={profile?.nicknameChangeAvailableAt || ""}
          draft={nicknameDraft}
          onDraftChange={setNicknameDraft}
          onAvailabilityChange={setNicknameAvailable}
          disabled={saving}
        />

        <section className="settings-prefs profile-edit-section">
          <h2 className="settings-prefs__label">출생년도</h2>
          <input
            type="text"
            inputMode="numeric"
            className="settings-nickname__input"
            value={birthYearText}
            onChange={(e) => setBirthYearText(parseBirthYearInput(e.target.value).text)}
            placeholder="예: 1987"
            maxLength={4}
            aria-label="출생년도"
          />
        </section>

        <section className="settings-prefs profile-edit-section">
          <h2 className="settings-prefs__label">활동지역</h2>
          <button type="button" className="settings-prefs__region" onClick={() => setRegionSheetOpen(true)}>
            <span>{region}</span>
            <span aria-hidden="true">›</span>
          </button>
          <p className="settings-prefs__hint">시·군·구 단위로 선택합니다.</p>
        </section>

        <section className="settings-prefs profile-edit-section">
          <h2 className="settings-prefs__label">직종</h2>
          <div className="settings-prefs__chips" role="list">
            {CRAFT_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                role="listitem"
                className={`settings-prefs__chip${craft === key ? " is-active" : ""}`}
                onClick={() => setCraft(key)}
              >
                {CRAFT_LABEL[key] || key}
              </button>
            ))}
          </div>
          <div className="settings-prefs__chips profile-edit-role-chips" role="list">
            {ROLE_OPTIONS.map((item) => (
              <button
                key={item}
                type="button"
                role="listitem"
                className={`settings-prefs__chip${role === item ? " is-active" : ""}`}
                onClick={() => setRole(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <p className="settings-prefs__hint">
            {craftLabel} · {role}
          </p>
        </section>

        <section className="settings-prefs profile-edit-section">
          <h2 className="settings-prefs__label">희망 일당</h2>
          <div className="profile-edit-pay-row">
            <input
              type="text"
              inputMode="numeric"
              className="settings-nickname__input profile-edit-pay-row__input"
              value={desiredPayText}
              onChange={(e) => setDesiredPayText(parseDesiredPayInput(e.target.value).text)}
              placeholder="숫자만 입력"
              maxLength={3}
              aria-label="희망 일당"
            />
            <span className="profile-edit-pay-row__unit">만원</span>
          </div>
          <p className="settings-prefs__hint">인원 목록과 내 프로필에 표시됩니다.</p>
        </section>

        <section className="settings-prefs profile-edit-section">
          <h2 className="settings-prefs__label">자기소개</h2>
          <textarea
            className="profile-edit-intro"
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            placeholder="현장 경험, 가능 공정, 연락 가능 시간 등"
            maxLength={200}
            rows={4}
          />
        </section>

        <div className="profile-edit-save-wrap">
          <button
            type="button"
            className="settings-nickname__save"
            onClick={onSave}
            disabled={saving || !nicknameOk}
          >
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>

      {regionSheetOpen ? (
        <div className="settings-region-sheet-backdrop" role="presentation" onClick={() => setRegionSheetOpen(false)}>
          <div
            className="settings-region-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="활동지역 선택"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="settings-region-sheet__head">
              <strong>활동지역</strong>
              <button type="button" className="settings-sheet__close" onClick={() => setRegionSheetOpen(false)} aria-label="닫기">
                ×
              </button>
            </div>
            <div className="settings-region-sheet__list">
              {ACTIVITY_REGIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`settings-region-sheet__item${region === item ? " is-active" : ""}`}
                  onClick={() => {
                    setRegion(item);
                    setRegionSheetOpen(false);
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
