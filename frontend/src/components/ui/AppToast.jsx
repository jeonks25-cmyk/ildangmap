import React, { useEffect } from "react";
import { useUiStore } from "../../store/useUiStore";

export default function AppToast() {
  const message = useUiStore((s) => s.appToastMessage);
  const at = useUiStore((s) => s.appToastAt);
  const clearAppToast = useUiStore((s) => s.clearAppToast);

  useEffect(() => {
    if (!message) return undefined;
    const t = window.setTimeout(() => clearAppToast(), 4200);
    return () => window.clearTimeout(t);
  }, [message, at, clearAppToast]);

  if (!message) return null;

  return (
    <div className="app-toast" role="status" aria-live="polite">
      <p className="app-toast__text">{message}</p>
      <button type="button" className="app-toast__close" onClick={() => clearAppToast()} aria-label="닫기">
        닫기
      </button>
    </div>
  );
}
