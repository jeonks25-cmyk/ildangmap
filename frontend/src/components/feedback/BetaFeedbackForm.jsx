import React, { useMemo, useState } from "react";
import {
  BETA_FEEDBACK_CATEGORIES,
  BETA_FEEDBACK_REPORT_TYPES,
} from "../../constants/betaFeedback";
import { submitBetaFeedback } from "../../api/feedbackApi";
import { useAuth } from "../../context/AuthContext";
import { useUserProfile } from "../../context/UserProfileContext";
import { getDisplayNickname } from "../../utils/displayNickname";
import BetaFeedbackImagePicker from "./BetaFeedbackImagePicker";

function labelForCategory(value) {
  return BETA_FEEDBACK_CATEGORIES.find((item) => item.value === value)?.label || "";
}

export default function BetaFeedbackForm({ onSubmitted }) {
  const { authUser } = useAuth();
  const { profile } = useUserProfile();
  const displayName = getDisplayNickname(profile, authUser);

  const [reportType, setReportType] = useState("FEEDBACK");
  const [category, setCategory] = useState("OTHER");
  const [content, setContent] = useState("");
  const [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => Boolean(content.trim()), [content]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    setError("");
    try {
      await submitBetaFeedback({
        reportType,
        content: content.trim(),
        username: displayName || "익명",
        categoryLabel: labelForCategory(category),
        images,
      });
      onSubmitted?.();
    } catch (err) {
      setError(err?.message || "전송에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="beta-feedback-form" onSubmit={handleSubmit}>
      <fieldset className="beta-feedback-form__field">
        <legend className="beta-feedback-form__label">유형</legend>
        <div className="beta-feedback-form__severity-list">
          {BETA_FEEDBACK_REPORT_TYPES.map((item) => (
            <label
              key={item.value}
              className={`beta-feedback-form__severity${reportType === item.value ? " is-active" : ""}`}
            >
              <input
                type="radio"
                name="reportType"
                value={item.value}
                checked={reportType === item.value}
                onChange={() => setReportType(item.value)}
                disabled={busy}
              />
              <span className="beta-feedback-form__severity-title">{item.label}</span>
              <span className="beta-feedback-form__severity-hint">{item.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="beta-feedback-form__field">
        <legend className="beta-feedback-form__label">관련 영역 (선택)</legend>
        <div className="beta-feedback-form__pills">
          {BETA_FEEDBACK_CATEGORIES.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`beta-feedback-form__pill${category === item.value ? " is-active" : ""}`}
              onClick={() => setCategory(item.value)}
              disabled={busy}
            >
              {item.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="beta-feedback-form__field">
        <span className="beta-feedback-form__label">내용</span>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          placeholder={
            reportType === "BUG"
              ? "어떤 화면에서, 어떤 동작을 했을 때 문제가 생겼는지 적어주세요."
              : "불편했던 점이나 있으면 좋겠는 기능을 자유롭게 적어주세요."
          }
          disabled={busy}
          maxLength={4000}
        />
      </label>

      <div className="beta-feedback-form__field">
        <span className="beta-feedback-form__label">스크린샷 (선택)</span>
        <BetaFeedbackImagePicker files={images} onChange={setImages} disabled={busy} />
      </div>

      <p className="beta-feedback-form__meta">
        전송 시 Discord 채널로 알림이 갑니다 · {displayName || "익명"}
      </p>

      {error ? (
        <p className="beta-feedback-form__error" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className="beta-feedback-form__submit" disabled={!canSubmit || busy}>
        {busy ? "보내는 중…" : reportType === "BUG" ? "버그 신고 보내기" : "의견 보내기"}
      </button>
    </form>
  );
}
