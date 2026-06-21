import React, { useEffect, useState } from "react";
import { checkNicknameAvailability } from "../../api/nicknameApi";
import { validateNicknameInput } from "../../utils/displayNickname";

/**
 * 닉네임 변경 — 중복 확인 API (베타: 변경 횟수 제한 없음)
 */
export default function ProfileNicknameSection({
  currentNickname,
  draft,
  onDraftChange,
  onAvailabilityChange,
  disabled = false,
}) {
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null);

  const trimmedDraft = String(draft || "").trim();
  const unchanged = trimmedDraft === String(currentNickname || "").trim();

  useEffect(() => {
    if (!trimmedDraft || unchanged) {
      setAvailable(null);
      setError("");
      onAvailabilityChange?.(null);
      return undefined;
    }
    const v = validateNicknameInput(trimmedDraft);
    if (!v.ok) {
      setAvailable(null);
      setError(v.message);
      onAvailabilityChange?.(null);
      return undefined;
    }
    setChecking(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await checkNicknameAvailability(v.value);
        if (res && typeof res.available === "boolean") {
          setAvailable(res.available);
          onAvailabilityChange?.(res.available);
          setError(res.available ? "" : "이미 사용 중인 닉네임입니다.");
        } else {
          setAvailable(null);
          onAvailabilityChange?.(null);
          setError("닉네임 확인에 실패했습니다.");
        }
      } catch {
        setAvailable(null);
        onAvailabilityChange?.(null);
        setError("닉네임 확인에 실패했습니다.");
      } finally {
        setChecking(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [trimmedDraft, unchanged, onAvailabilityChange]);

  return (
    <section className="settings-nickname" aria-labelledby="profile-nickname-title">
      <h2 id="profile-nickname-title" className="settings-prefs__label">
        활동명(닉네임)
      </h2>
      <p className="settings-nickname__lead">
        현재 활동명: <strong>{currentNickname || "미설정"}</strong>
        {" · "}
        언제든 변경할 수 있습니다
      </p>

      <div className="settings-nickname__field">
        <label className="settings-nickname__label" htmlFor="profile-nickname-input">
          새 활동명
        </label>
        <input
          id="profile-nickname-input"
          type="text"
          className="settings-nickname__input"
          value={draft}
          onChange={(e) => {
            onDraftChange(e.target.value);
            setError("");
          }}
          placeholder="예: 필름기공87"
          maxLength={16}
          autoComplete="off"
          disabled={disabled}
        />
        {error ? <p className="settings-nickname__error">{error}</p> : null}
        {checking ? <p className="settings-nickname__preview">중복 확인 중…</p> : null}
        {!checking && available === true && !unchanged ? (
          <p className="settings-nickname__preview">사용 가능한 닉네임입니다.</p>
        ) : null}
      </div>
    </section>
  );
}

export function canSubmitNicknameChange({ draft, currentNickname, available }) {
  const trimmed = String(draft || "").trim();
  if (!trimmed || trimmed === String(currentNickname || "").trim()) return true;
  const v = validateNicknameInput(trimmed);
  if (!v.ok) return false;
  return available === true;
}

export function resolveNicknameChangeError({ draft, currentNickname, available }) {
  const trimmed = String(draft || "").trim();
  if (!trimmed || trimmed === String(currentNickname || "").trim()) return "";
  const v = validateNicknameInput(trimmed);
  if (!v.ok) return v.message;
  if (available === false) return "이미 사용 중인 닉네임입니다.";
  if (available !== true) return "닉네임 중복 확인을 기다려 주세요.";
  return "";
}
