import React, { useMemo, useState } from "react";
import {
  BETA_FEEDBACK_CATEGORIES,
  BETA_FEEDBACK_SEVERITIES,
} from "../../constants/betaFeedback";
import { submitBetaFeedback } from "../../api/feedbackApi";
import BetaFeedbackImagePicker from "./BetaFeedbackImagePicker";

export default function BetaFeedbackForm({ onSubmitted }) {
  const [category, setCategory] = useState("MAP");
  const [severity, setSeverity] = useState("NORMAL");
  const [inconvenient, setInconvenient] = useState("");
  const [featureRequest, setFeatureRequest] = useState("");
  const [otherComment, setOtherComment] = useState("");
  const [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    return Boolean(inconvenient.trim() || featureRequest.trim() || otherComment.trim());
  }, [inconvenient, featureRequest, otherComment]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    setError("");
    try {
      await submitBetaFeedback({
        category,
        severity,
        inconvenient: inconvenient.trim() || undefined,
        featureRequest: featureRequest.trim() || undefined,
        otherComment: otherComment.trim() || undefined,
        images,
      });
      onSubmitted?.();
    } catch (err) {
      setError(err?.message || "피드백 전송에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="beta-feedback-form" onSubmit={handleSubmit}>
      <fieldset className="beta-feedback-form__field">
        <legend className="beta-feedback-form__label">어떤 영역인가요?</legend>
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

      <fieldset className="beta-feedback-form__field">
        <legend className="beta-feedback-form__label">얼마나 불편했나요?</legend>
        <div className="beta-feedback-form__severity-list">
          {BETA_FEEDBACK_SEVERITIES.map((item) => (
            <label key={item.value} className={`beta-feedback-form__severity${severity === item.value ? " is-active" : ""}`}>
              <input
                type="radio"
                name="severity"
                value={item.value}
                checked={severity === item.value}
                onChange={() => setSeverity(item.value)}
                disabled={busy}
              />
              <span className="beta-feedback-form__severity-title">{item.label}</span>
              <span className="beta-feedback-form__severity-hint">{item.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="beta-feedback-form__field">
        <span className="beta-feedback-form__label">가장 답답했던 점</span>
        <textarea
          value={inconvenient}
          onChange={(e) => setInconvenient(e.target.value)}
          rows={3}
          placeholder="무엇을 하려다 막혔는지, 어떤 점이 불편했는지 적어주세요."
          disabled={busy}
        />
      </label>

      <label className="beta-feedback-form__field">
        <span className="beta-feedback-form__label">있으면 좋겠는 기능</span>
        <textarea
          value={featureRequest}
          onChange={(e) => setFeatureRequest(e.target.value)}
          rows={3}
          placeholder="추가되면 현장에서 더 편해질 기능이 있다면 적어주세요."
          disabled={busy}
        />
      </label>

      <label className="beta-feedback-form__field">
        <span className="beta-feedback-form__label">기타 의견</span>
        <textarea
          value={otherComment}
          onChange={(e) => setOtherComment(e.target.value)}
          rows={2}
          placeholder="버그, 오타, 기타 자유 의견"
          disabled={busy}
        />
      </label>

      <div className="beta-feedback-form__field">
        <span className="beta-feedback-form__label">스크린샷 (선택)</span>
        <BetaFeedbackImagePicker files={images} onChange={setImages} disabled={busy} />
      </div>

      {error ? <p className="beta-feedback-form__error" role="alert">{error}</p> : null}

      <button type="submit" className="beta-feedback-form__submit" disabled={!canSubmit || busy}>
        {busy ? "보내는 중…" : "의견 보내기"}
      </button>
    </form>
  );
}
