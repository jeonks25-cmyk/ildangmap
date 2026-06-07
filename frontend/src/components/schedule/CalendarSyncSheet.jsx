import React, { useCallback, useEffect, useState } from "react";
import {
  CALENDAR_SYNC_STATUS,
  disconnectCalendarSync,
  getCalendarSyncStatusLabel,
  loadCalendarSyncConnections,
  requestCalendarSyncConnect,
} from "../../utils/calendarSyncModel";

export default function CalendarSyncSheet({ open, onClose, onToast }) {
  const [connections, setConnections] = useState(() => loadCalendarSyncConnections());

  useEffect(() => {
    if (open) setConnections(loadCalendarSyncConnections());
  }, [open]);

  const refresh = useCallback(() => {
    setConnections(loadCalendarSyncConnections());
  }, []);

  const handleConnect = useCallback(
    async (provider) => {
      const result = await requestCalendarSyncConnect(provider.id);
      refresh();
      if (result.reason === "api_not_ready") {
        onToast?.(`${provider.label} 연동 API 준비 중입니다. 곧 연결할 수 있어요.`);
        return;
      }
      if (!result.ok) {
        onToast?.("연동을 시작할 수 없습니다.");
      }
    },
    [onToast, refresh]
  );

  const handleDisconnect = useCallback(
    (providerId, label) => {
      disconnectCalendarSync(providerId);
      refresh();
      onToast?.(`${label} 연동을 해제했습니다.`);
    },
    [onToast, refresh]
  );

  if (!open) return null;

  return (
    <div className="calendar-sync-sheet" role="presentation" onClick={() => onClose?.()}>
      <section
        className="calendar-sync-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-label="외부 캘린더 동기화"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="calendar-sync-sheet__grab" aria-hidden="true" />
        <header className="calendar-sync-sheet__head">
          <div>
            <p className="calendar-sync-sheet__eyebrow">외부 캘린더</p>
            <h2 className="calendar-sync-sheet__title">캘린더 동기화</h2>
            <p className="calendar-sync-sheet__sub">
              Google · 네이버 · Apple 일정을 한곳에서 맞춥니다. 현재는 연동 준비 UI입니다.
            </p>
          </div>
          <button type="button" className="calendar-sync-sheet__close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </header>

        <ul className="calendar-sync-sheet__list">
          {connections.map((provider) => {
            const isConnected = provider.status === CALENDAR_SYNC_STATUS.CONNECTED;
            const isReady = provider.status === CALENDAR_SYNC_STATUS.READY;
            return (
              <li key={provider.id} className="calendar-sync-sheet__item">
                <div className="calendar-sync-sheet__item-main">
                  <span className={`calendar-sync-sheet__logo calendar-sync-sheet__logo--${provider.id}`}>
                    {provider.icon || ""}
                  </span>
                  <div className="calendar-sync-sheet__item-copy">
                    <strong>{provider.label}</strong>
                    <p>{provider.description}</p>
                    <span className="calendar-sync-sheet__status">
                      {getCalendarSyncStatusLabel(provider.status)}
                      {provider.accountLabel ? ` · ${provider.accountLabel}` : ""}
                    </span>
                  </div>
                </div>
                <div className="calendar-sync-sheet__item-actions">
                  {isConnected || isReady ? (
                    <button
                      type="button"
                      className="calendar-sync-sheet__btn calendar-sync-sheet__btn--ghost"
                      onClick={() => handleDisconnect(provider.id, provider.label)}
                    >
                      해제
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="calendar-sync-sheet__btn calendar-sync-sheet__btn--primary"
                    onClick={() => handleConnect(provider)}
                    disabled={provider.apiReady === false && isConnected}
                  >
                    {provider.apiReady ? "연동하기" : "연동 준비"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="calendar-sync-sheet__note">
          일당맵 현장·개인 일정과 외부 캘린더 일정이 같은 월간 보기에 합쳐집니다. API 연결 후 자동으로 맞춰집니다.
        </p>
      </section>
    </div>
  );
}
