import React from "react";
import { createPortal } from "react-dom";
import { formatCoworkCraftLabel } from "../../utils/coworkHistoryModel";
import "../../styles/field-business-card.css";

/**
 * 협업 현장 전체 이력 타임라인 — 최신순.
 * 평판/별점/배지 없음.
 */
export default function CoworkHistorySheet({ open, personName, entries = [], onClose }) {
  if (!open) return null;

  const list = Array.isArray(entries) ? entries : [];

  return createPortal(
    <div className="cowork-history-sheet" role="presentation" onClick={onClose}>
      <section
        className="cowork-history-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-label={`${personName || "작업자"} 협업 이력`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cowork-history-sheet__head">
          <div>
            <h2 className="cowork-history-sheet__title">{personName || "작업자"} 협업 이력</h2>
            <p className="cowork-history-sheet__sub">함께한 현장 {list.length}건 · 최신순</p>
          </div>
          <button type="button" className="cowork-history-sheet__close" onClick={onClose}>
            닫기
          </button>
        </header>

        <div className="cowork-history-sheet__body">
          {list.length === 0 ? (
            <p className="cowork-history-sheet__empty">아직 함께한 현장 기록이 없습니다.</p>
          ) : (
            <ol className="cowork-history-sheet__timeline">
              {list.map((entry) => {
                const craftLabel = formatCoworkCraftLabel(entry.craft);
                return (
                  <li key={entry.id} className="cowork-history-sheet__item">
                    <span className="cowork-history-sheet__dot" aria-hidden="true" />
                    <div className="cowork-history-sheet__item-body">
                      <strong className="cowork-history-sheet__site">{entry.siteName}</strong>
                      <span className="cowork-history-sheet__meta">
                        {[entry.workDate, craftLabel].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>
    </div>,
    document.body
  );
}
