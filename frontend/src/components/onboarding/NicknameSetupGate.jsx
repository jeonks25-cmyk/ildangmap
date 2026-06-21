import React, { useEffect, useMemo, useState } from "react";
import { checkNicknameAvailability } from "../../api/nicknameApi";
import { useUserProfile } from "../../context/UserProfileContext";
import { useUserStore } from "../../store/useUserStore";
import { useUiStore } from "../../store/useUiStore";
import { suggestNicknames, validateNicknameInput } from "../../utils/displayNickname";
import { getPrimaryRegion } from "../../constants/activityRegions";
import { CRAFT_LABEL } from "../../utils/jobModel";

/** 최초 로그인 — 활동명(닉네임) 설정 (카카오 이름 미사용) */
export default function NicknameSetupGate() {
  const { profile } = useUserProfile();
  const prefs = useUserStore((s) => s.prefs);
  const completeNicknameSetup = useUserStore((s) => s.completeNicknameSetup);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [available, setAvailable] = useState(null);

  const suggestions = useMemo(
    () =>
      suggestNicknames({
        craft: profile?.craft || prefs?.craft || "film",
        region: getPrimaryRegion(profile?.regions, profile?.region || prefs?.regionLabel || "대전"),
        birthYear: profile?.birthYear,
        count: 5,
      }),
    [profile?.craft, profile?.birthYear, profile?.regions, profile?.region, prefs?.craft, prefs?.regionLabel],
  );

  useEffect(() => {
    if (!draft.trim()) {
      setAvailable(null);
      return undefined;
    }
    const v = validateNicknameInput(draft);
    if (!v.ok) {
      setAvailable(null);
      return undefined;
    }
    setChecking(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await checkNicknameAvailability(v.value);
        if (res && typeof res.available === "boolean") {
          setAvailable(res.available);
          setError(res.available ? "" : "이미 사용 중인 닉네임입니다.");
        } else {
          setAvailable(null);
          setError("닉네임 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        }
      } catch {
        setAvailable(null);
        setError("닉네임 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        setChecking(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [draft]);

  const onPickSuggestion = (nick) => {
    setDraft(nick);
    setError("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const v = validateNicknameInput(draft);
    if (!v.ok) {
      setError(v.message);
      return;
    }
    if (available === false) {
      setError("이미 사용 중인 닉네임입니다.");
      return;
    }
    setSaving(true);
    try {
      const res = await completeNicknameSetup(v.value);
      if (!res?.ok) {
        setError(res?.message || "닉네임 설정에 실패했습니다.");
        return;
      }
      useUiStore.getState().showAppToast("활동명이 설정되었습니다");
    } catch (err) {
      setError(err?.message || "닉네임 설정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const craftLabel = CRAFT_LABEL[profile?.craft || prefs?.craft || "film"] || "필름";

  return (
    <div className="onboarding-gate" role="dialog" aria-modal="true" aria-labelledby="nickname-setup-title">
      <div className="onboarding-gate__screen onboarding-gate__screen--prefs">
        <div className="onboarding-gate__eyebrow">최초 1회</div>
        <h2 id="nickname-setup-title" className="onboarding-gate__section-title">
          현장 활동명 설정
        </h2>
        <p className="onboarding-gate__section-sub">
          게시판·현장 정보에 표시되는 이름입니다. 실명은 노출되지 않으며, 설정 후 30일에 1회 변경할 수 있습니다.
        </p>

        <section className="onboarding-pref-group">
          <h3 className="onboarding-pref-group__title">추천 활동명</h3>
          <div className="onboarding-pref-group__chips" role="list">
            {suggestions.map((nick) => (
              <button
                key={nick}
                type="button"
                role="listitem"
                className={`onboarding-pref-chip${draft === nick ? " is-active" : ""}`}
                onClick={() => onPickSuggestion(nick)}
              >
                {nick}
              </button>
            ))}
          </div>
          <p className="onboarding-gate__note">
            {craftLabel} · {getPrimaryRegion(profile?.regions, profile?.region || prefs?.regionLabel || "대전")} 기준 추천
          </p>
        </section>

        <form onSubmit={onSubmit}>
          <section className="onboarding-pref-group">
            <h3 className="onboarding-pref-group__title">직접 입력</h3>
            <input
              type="text"
              className="onboarding-text-input"
              value={draft}
              onChange={(ev) => {
                setDraft(ev.target.value);
                setError("");
              }}
              placeholder="예: 필름기공87"
              maxLength={16}
              autoComplete="off"
            />
            {error ? <p className="onboarding-input-hint onboarding-input-hint--warn">{error}</p> : null}
            {checking ? <p className="onboarding-gate__note">중복 확인 중…</p> : null}
            {!checking && available === true ? (
              <p className="onboarding-gate__note">사용 가능한 닉네임입니다.</p>
            ) : null}
          </section>

          <button type="submit" className="onboarding-gate__primary" disabled={saving || !draft.trim() || available === false}>
            {saving ? "저장 중…" : "활동명 설정하고 시작하기"}
          </button>
        </form>
      </div>
    </div>
  );
}
