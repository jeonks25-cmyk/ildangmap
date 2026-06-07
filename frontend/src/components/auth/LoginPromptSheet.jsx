import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { isDevLoginShortcutEnabled, isMockApiEnabled } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useUiStore } from "../../store/useUiStore";

const COPY = {
  default: "로그인이 필요한 기능이에요.",
  apply: "지원하려면 로그인이 필요해요.",
  post: "현장 등록은 로그인 후 이용할 수 있어요.",
  applicants: "참여 요청 관리는 로그인 후 이용할 수 있어요.",
  consumer: "시공 요청은 로그인 후 이용할 수 있어요.",
  my: "내 활동은 로그인 후 확인할 수 있어요.",
  briefing: "현장 운영 기록은 로그인한 확정 참여자만 이용할 수 있어요.",
};

export default function LoginPromptSheet() {
  const authPromptOpen = useUiStore((s) => s.authPromptOpen);
  const authPromptReason = useUiStore((s) => s.authPromptReason);
  const closeAuthPrompt = useUiStore((s) => s.closeAuthPrompt);
  const { loginWithKakaoMock, startKakaoOAuthLogin, meBootstrapLoading } = useAuth();
  const [busy, setBusy] = useState(false);

  const message = useMemo(() => COPY[authPromptReason] || COPY.default, [authPromptReason]);

  if (!authPromptOpen) return null;

  const onKakao = async () => {
    if (busy || meBootstrapLoading) return;
    if (isMockApiEnabled()) {
      setBusy(true);
      try {
        await loginWithKakaoMock();
        closeAuthPrompt();
      } finally {
        setBusy(false);
      }
      return;
    }
    setBusy(true);
    try {
      await startKakaoOAuthLogin();
    } finally {
      setBusy(false);
    }
  };

  const onDevMock = async () => {
    if (busy || meBootstrapLoading) return;
    setBusy(true);
    try {
      await loginWithKakaoMock();
      closeAuthPrompt();
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="login-prompt-sheet-backdrop" role="presentation" onClick={() => closeAuthPrompt()}>
      <div
        className="login-prompt-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-prompt-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="login-prompt-sheet__grab" aria-hidden="true" />
        <h2 id="login-prompt-title" className="login-prompt-sheet__title">
          로그인
        </h2>
        <p className="login-prompt-sheet__lead">{message}</p>
        <p className="login-prompt-sheet__hint">지도와 현장은 로그인 없이 볼 수 있어요.</p>
        <button
          type="button"
          className="login-prompt-sheet__kakao"
          onClick={onKakao}
          disabled={busy || meBootstrapLoading}
        >
          {busy || meBootstrapLoading ? "처리 중…" : "카카오로 계속하기"}
        </button>
        {!isMockApiEnabled() && isDevLoginShortcutEnabled() ? (
          <button
            type="button"
            className="login-prompt-sheet__dev"
            onClick={onDevMock}
            disabled={busy || meBootstrapLoading}
          >
            개발용 로그인 (Mock)
          </button>
        ) : null}
        <button type="button" className="login-prompt-sheet__later" onClick={() => closeAuthPrompt()}>
          나중에
        </button>
      </div>
    </div>,
    document.body
  );
}
