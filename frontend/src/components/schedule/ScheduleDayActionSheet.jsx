import React from "react";
import { createPortal } from "react-dom";

function formatDayLabel(dateKey) {
  if (!dateKey) return "";
  const [y, m, d] = String(dateKey).split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  if (Number.isNaN(dt.getTime())) return dateKey;
  return `${m}월 ${d}일`;
}

/**
 * 날짜 탭 시 — 즉시 토글 없이 가능/불가/개인일정 추가 선택.
 */
export default function ScheduleDayActionSheet({ open, dateKey, onClose, onMarkAvailable, onMarkUnavailable, onAddPersonal }) {
  if (!open || !dateKey) return null;

  const label = formatDayLabel(dateKey);

  return createPortal(
    <div className="contact-sheet" role="dialog" aria-modal="true" aria-label={`${label} 일정`}>
      <button type="button" className="contact-sheet__backdrop" aria-label="닫기" onClick={onClose} />
      <div className="contact-sheet__panel contact-sheet__panel--actions">
        <div className="contact-sheet__grab" aria-hidden="true" />
        <header className="contact-sheet__head">
          <h2 className="contact-sheet__title">{label}</h2>
          <p className="contact-sheet__sub">가능 여부 또는 개인 일정을 선택하세요</p>
        </header>
        <div className="contact-action-sheet__actions schedule-day-sheet__actions">
          <button
            type="button"
            className="contact-action-sheet__btn contact-action-sheet__btn--primary"
            onClick={() => {
              onMarkAvailable?.();
              onClose?.();
            }}
          >
            가능으로 표시
          </button>
          <button
            type="button"
            className="contact-action-sheet__btn"
            onClick={() => {
              onMarkUnavailable?.();
              onClose?.();
            }}
          >
            불가능으로 표시
          </button>
          <button
            type="button"
            className="contact-action-sheet__btn"
            onClick={() => {
              onAddPersonal?.();
              onClose?.();
            }}
          >
            개인 일정 추가
          </button>
          <button type="button" className="contact-action-sheet__btn" onClick={onClose}>
            취소
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
