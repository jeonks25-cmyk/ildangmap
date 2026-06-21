import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUiStore } from "../store/useUiStore";
import BetaFeedbackForm from "../components/feedback/BetaFeedbackForm";
import "../styles/beta-feedback.css";

export default function BetaFeedbackPage() {
  const navigate = useNavigate();
  const { isAuthenticated, authReady, startKakaoOAuthLogin } = useAuth();
  const showAppToast = useUiStore((s) => s.showAppToast);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitted = () => {
    setSubmitted(true);
    showAppToast("베타 의견을 보냈습니다. 감사합니다!");
  };

  return (
    <div className="beta-feedback-page">
      <header className="beta-feedback-page__header">
        <button type="button" className="beta-feedback-page__back" onClick={() => navigate(-1)} aria-label="뒤로">
          ←
        </button>
        <div>
          <p className="beta-feedback-page__eyebrow">베타 테스트</p>
          <h1 className="beta-feedback-page__title">의견 보내기</h1>
          <p className="beta-feedback-page__lead">
            현장에서 겪은 불편함이나 개선 아이디어를 알려주세요. 비슷한 의견은 자동으로 묶여 우선순위 파악에 도움이 됩니다.
          </p>
        </div>
      </header>

      {!authReady ? (
        <p className="beta-feedback-page__status">확인 중…</p>
      ) : !isAuthenticated ? (
        <section className="beta-feedback-page__card">
          <p>피드백을 내려면 로그인이 필요합니다.</p>
          <button type="button" className="beta-feedback-form__submit" onClick={() => startKakaoOAuthLogin()}>
            카카오 로그인
          </button>
        </section>
      ) : submitted ? (
        <section className="beta-feedback-page__card beta-feedback-page__card--success">
          <h2>접수 완료</h2>
          <p>소중한 의견 감사합니다. 베타 기간 동안 빠르게 반영하겠습니다.</p>
          <button type="button" className="beta-feedback-form__submit" onClick={() => navigate("/settings")}>
            설정으로 돌아가기
          </button>
        </section>
      ) : (
        <section className="beta-feedback-page__card">
          <BetaFeedbackForm onSubmitted={handleSubmitted} />
        </section>
      )}
    </div>
  );
}
