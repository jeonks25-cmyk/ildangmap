import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProfileNicknameSection, {
  canSubmitNicknameChange,
  resolveNicknameChangeError,
} from "../components/settings/ProfileNicknameSection";
import ActivityRegionsSheet from "../components/shared/ActivityRegionsSheet";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../context/UserProfileContext";
import { useUserStore } from "../store/useUserStore";
import { useUiStore } from "../store/useUiStore";
import { formatRegionsLabel, normalizeActivityRegions } from "../constants/activityRegions";
import { getDisplayNickname } from "../utils/displayNickname";
import { CRAFT_KEYS, CRAFT_LABEL } from "../utils/jobModel";
import { profilePatchFromForm, parseBusinessRegNoInput, normalizeBusinessCardFields } from "../models/profileModel";
import { compressImageFileToDataUrl } from "../utils/briefingImageCompress";
import "../styles/settings-tab-mobile.css";

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

function parseExperienceInput(value) {
  const digits = String(value || "").replace(/[^\d]/g, "").slice(0, 2);
  if (!digits) return { text: "", number: null };
  return { text: digits, number: Number(digits) };
}

export default function ProfileEditPage() {
  const navigate = useNavigate();
  const { authUser, isAuthenticated } = useAuth();
  const { profile, profileMeta } = useUserProfile();
  const saveProfileDetails = useUserStore((s) => s.saveProfileDetails);
  const changeDisplayNickname = useUserStore((s) => s.changeDisplayNickname);
  const showAppToast = useUiStore((s) => s.showAppToast);

  const currentNickname = getDisplayNickname(profile, authUser);

  const [nicknameDraft, setNicknameDraft] = useState(currentNickname);
  const [birthYearText, setBirthYearText] = useState(profile?.birthYear ? String(profile.birthYear) : "");
  const [regions, setRegions] = useState(() => normalizeActivityRegions(profile?.regions ?? profile?.region));
  const [craft, setCraft] = useState(profile?.craft || "film");
  const [desiredPayText, setDesiredPayText] = useState(
    profile?.desiredPay != null ? String(profile.desiredPay) : ""
  );
  const [experienceYearsText, setExperienceYearsText] = useState(
    profile?.experienceYears != null ? String(profile.experienceYears) : ""
  );
  const [phone, setPhone] = useState(profile?.phone || "");
  const [intro, setIntro] = useState(profileMeta?.intro || "");
  const [businessName, setBusinessName] = useState(profile?.businessName || "");
  const [jobTitle, setJobTitle] = useState(profile?.jobTitle || "");
  const [kakaoTalkId, setKakaoTalkId] = useState(profile?.kakaoTalkId || "");
  const [blogUrl, setBlogUrl] = useState(profile?.blogUrl || "");
  const [instagramUrl, setInstagramUrl] = useState(profile?.instagramUrl || "");
  const [homepageUrl, setHomepageUrl] = useState(profile?.homepageUrl || "");
  const [portfolioImageUrl, setPortfolioImageUrl] = useState(profile?.portfolioImageUrl || "");
  const [businessRegNoText, setBusinessRegNoText] = useState(
    profile?.businessRegNo ? String(profile.businessRegNo) : ""
  );
  const [portfolioUploading, setPortfolioUploading] = useState(false);
  const [regionSheetOpen, setRegionSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState(null);

  const storedRegionsKey = useMemo(
    () => normalizeActivityRegions(profile?.regions ?? profile?.region).join("\u0000"),
    [profile?.regions, profile?.region]
  );

  // profile 객체 참조만 바뀌는 /me·extras 동기화로 편집 중 선택값이 덮이지 않도록 필드별로만 반영
  useEffect(() => {
    setNicknameDraft(currentNickname);
  }, [currentNickname]);

  useEffect(() => {
    setRegions(normalizeActivityRegions(profile?.regions ?? profile?.region));
    // storedRegionsKey가 profile.regions·region을 직렬화 — /me 동기화 객체 참조 변경은 무시
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedRegionsKey]);

  const storedCardKey = useMemo(
    () => JSON.stringify(normalizeBusinessCardFields(profile || {})),
    [profile]
  );

  useEffect(() => {
    setBirthYearText(profile?.birthYear ? String(profile.birthYear) : "");
    setCraft(profile?.craft || "film");
    setDesiredPayText(profile?.desiredPay != null ? String(profile.desiredPay) : "");
    setExperienceYearsText(profile?.experienceYears != null ? String(profile.experienceYears) : "");
    setPhone(profile?.phone || "");
  }, [profile?.birthYear, profile?.craft, profile?.desiredPay, profile?.experienceYears, profile?.phone]);

  useEffect(() => {
    const card = normalizeBusinessCardFields(profile || {});
    setBusinessName(card.businessName);
    setJobTitle(card.jobTitle);
    setKakaoTalkId(card.kakaoTalkId);
    setBlogUrl(card.blogUrl);
    setInstagramUrl(card.instagramUrl);
    setHomepageUrl(card.homepageUrl);
    setPortfolioImageUrl(card.portfolioImageUrl);
    setBusinessRegNoText(card.businessRegNo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedCardKey]);

  useEffect(() => {
    setIntro(profileMeta?.intro || "");
  }, [profileMeta?.intro]);

  const nicknameOk = canSubmitNicknameChange({
    draft: nicknameDraft,
    currentNickname,
    available: nicknameAvailable,
  });

  const regionLabel = useMemo(() => formatRegionsLabel(regions), [regions]);

  const onPortfolioFile = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      setPortfolioUploading(true);
      try {
        const dataUrl = await compressImageFileToDataUrl(file, { maxWidth: 1200, maxChars: 180_000 });
        setPortfolioImageUrl(dataUrl);
      } catch (err) {
        showAppToast(err?.message || "이미지를 처리하지 못했습니다.");
      } finally {
        setPortfolioUploading(false);
      }
    },
    [showAppToast]
  );

  const onSave = useCallback(async () => {
    if (!isAuthenticated) {
      showAppToast("로그인 후 프로필을 수정할 수 있습니다.");
      return;
    }

    const nicknameErr = resolveNicknameChangeError({
      draft: nicknameDraft,
      currentNickname,
      available: nicknameAvailable,
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
    const exp = parseExperienceInput(experienceYearsText);
    const bizReg = parseBusinessRegNoInput(businessRegNoText);
    if (bizReg.text && bizReg.text.length !== 10) {
      showAppToast("사업자등록번호는 10자리 숫자입니다. (선택)");
      return;
    }

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

      const normalizedRegions = normalizeActivityRegions(regions);
      const saveResult = await saveProfileDetails({
        ...profilePatchFromForm({
          nickname: trimmedNick,
          regions: normalizedRegions,
          craft,
          experienceYearsText: exp.text,
          desiredPayText: pay.text,
          phone,
          businessName,
          jobTitle,
          kakaoTalkId,
          blogUrl,
          instagramUrl,
          homepageUrl,
          portfolioImageUrl,
          businessRegNo: bizReg.text,
        }),
        birthYear: birth.number,
        intro: String(intro || "").trim(),
      });
      if (!saveResult?.ok) {
        showAppToast(saveResult?.message || "저장에 실패했습니다.");
        return;
      }

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
    nicknameAvailable,
    birthYearText,
    desiredPayText,
    experienceYearsText,
    phone,
    regions,
    craft,
    intro,
    businessName,
    jobTitle,
    kakaoTalkId,
    blogUrl,
    instagramUrl,
    homepageUrl,
    portfolioImageUrl,
    businessRegNoText,
    changeDisplayNickname,
    saveProfileDetails,
    showAppToast,
    navigate,
  ]);

  if (!isAuthenticated) {
    return (
      <div className="my-tab-page my-tab-page--profile-hub tab-page-shell">
        <header className="profile-edit-header">
          <button type="button" className="profile-edit-header__back" onClick={() => navigate("/settings")} aria-label="뒤로">
            ←
          </button>
          <h1 className="profile-edit-header__title">내 정보 관리</h1>
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
    <div className="my-tab-page my-tab-page--profile-hub tab-page-shell profile-edit-shell">
      <header className="profile-edit-header">
        <button type="button" className="profile-edit-header__back" onClick={() => navigate("/settings")} aria-label="뒤로">
          ←
        </button>
        <h1 className="profile-edit-header__title">내 명함</h1>
      </header>

      <div className="profile-edit-scroll">
        <div className="profile-edit-page">
        <p className="profile-edit-lead">현장에서 공유하는 기술자 명함입니다. 명함 공유·QR은 곧 제공됩니다.</p>
        <ProfileNicknameSection
          currentNickname={currentNickname}
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
            <span>{regionLabel}</span>
            <span aria-hidden="true">›</span>
          </button>
          <p className="settings-prefs__hint">시 단위 · 여러 곳 선택 가능</p>
        </section>

        <section className="settings-prefs profile-edit-section">
          <h2 className="settings-prefs__label">공종</h2>
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
        </section>

        <section className="settings-prefs profile-edit-section">
          <h2 className="settings-prefs__label">경력 (년)</h2>
          <input
            type="text"
            inputMode="numeric"
            className="settings-nickname__input"
            value={experienceYearsText}
            onChange={(e) => setExperienceYearsText(parseExperienceInput(e.target.value).text)}
            placeholder="예: 8"
            maxLength={2}
            aria-label="경력"
          />
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
          <p className="settings-prefs__hint">예: 20 → 희망일당 20만원</p>
        </section>

        <section className="settings-prefs profile-edit-section">
          <h2 className="settings-prefs__label">연락처</h2>
          <input
            type="tel"
            className="settings-nickname__input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-0000-0000"
            aria-label="연락처"
          />
        </section>

        <section className="settings-prefs profile-edit-section">
          <h2 className="settings-prefs__label">자기소개</h2>
          <textarea
            className="profile-edit-intro"
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            placeholder="현장 경험, 가능 공정, 연락 가능 시간 등"
            maxLength={200}
            rows={3}
          />
        </section>

        <section className="settings-prefs profile-edit-section profile-edit-section--card">
          <h2 className="settings-prefs__label">명함 정보</h2>
          <p className="settings-prefs__hint">상호·SNS·포트폴리오 등 현장 명함에 표시할 정보</p>

          <label className="profile-edit-field-label" htmlFor="profile-business-name">상호명</label>
          <input
            id="profile-business-name"
            type="text"
            className="settings-nickname__input"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="예: ○○인테리어"
            maxLength={80}
          />

          <label className="profile-edit-field-label" htmlFor="profile-job-title">직책</label>
          <input
            id="profile-job-title"
            type="text"
            className="settings-nickname__input"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="예: 소장, 팀장, 기공"
            maxLength={40}
          />

          <label className="profile-edit-field-label" htmlFor="profile-kakao-id">카카오톡 ID</label>
          <input
            id="profile-kakao-id"
            type="text"
            className="settings-nickname__input"
            value={kakaoTalkId}
            onChange={(e) => setKakaoTalkId(e.target.value)}
            placeholder="카카오톡 검색 ID"
            maxLength={40}
            autoComplete="off"
          />

          <label className="profile-edit-field-label" htmlFor="profile-blog-url">블로그 URL</label>
          <input
            id="profile-blog-url"
            type="url"
            className="settings-nickname__input"
            value={blogUrl}
            onChange={(e) => setBlogUrl(e.target.value)}
            placeholder="https://"
            maxLength={255}
          />

          <label className="profile-edit-field-label" htmlFor="profile-instagram-url">인스타 URL</label>
          <input
            id="profile-instagram-url"
            type="url"
            className="settings-nickname__input"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="https://instagram.com/..."
            maxLength={255}
          />

          <label className="profile-edit-field-label" htmlFor="profile-homepage-url">홈페이지 URL</label>
          <input
            id="profile-homepage-url"
            type="url"
            className="settings-nickname__input"
            value={homepageUrl}
            onChange={(e) => setHomepageUrl(e.target.value)}
            placeholder="https://"
            maxLength={255}
          />

          <label className="profile-edit-field-label">포트폴리오 이미지</label>
          {portfolioImageUrl ? (
            <div className="profile-edit-portfolio">
              <img src={portfolioImageUrl} alt="포트폴리오 미리보기" className="profile-edit-portfolio__img" />
              <button
                type="button"
                className="profile-edit-portfolio__remove"
                onClick={() => setPortfolioImageUrl("")}
              >
                이미지 제거
              </button>
            </div>
          ) : null}
          <label className="profile-edit-portfolio-upload">
            <input
              type="file"
              accept="image/*"
              onChange={onPortfolioFile}
              disabled={portfolioUploading || saving}
            />
            <span>{portfolioUploading ? "이미지 처리 중…" : portfolioImageUrl ? "다른 이미지 선택" : "이미지 선택"}</span>
          </label>

          <label className="profile-edit-field-label" htmlFor="profile-business-reg">사업자등록번호 (선택)</label>
          <input
            id="profile-business-reg"
            type="text"
            inputMode="numeric"
            className="settings-nickname__input"
            value={businessRegNoText}
            onChange={(e) => setBusinessRegNoText(parseBusinessRegNoInput(e.target.value).text)}
            placeholder="10자리 숫자"
            maxLength={10}
          />
        </section>
        </div>
      </div>

      <footer className="profile-edit-save-bar">
        <button
          type="button"
          className="profile-edit-save-bar__btn"
          onClick={onSave}
          disabled={saving || !nicknameOk}
          aria-busy={saving}
        >
          {saving ? "저장 중…" : "저장"}
        </button>
      </footer>

      <ActivityRegionsSheet
        open={regionSheetOpen}
        value={regions}
        onChange={setRegions}
        onClose={() => setRegionSheetOpen(false)}
      />
    </div>
  );
}
