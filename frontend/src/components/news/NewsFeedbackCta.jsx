import React from "react";
import { useNavigate } from "react-router-dom";

export default function NewsFeedbackCta() {
  const navigate = useNavigate();

  return (
    <section className="ildang-news-cta" aria-label="의견 보내기">
      <p className="ildang-news-cta__eyebrow">💡 불편한 점이 있으셨나요?</p>
      <p className="ildang-news-cta__lead">여러분의 의견으로 일당맵이 더 좋아집니다.</p>
      <button type="button" className="ildang-news-cta__btn" onClick={() => navigate("/settings/beta-feedback")}>
        의견 보내기
      </button>
    </section>
  );
}
