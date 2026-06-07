import React from "react";
import { PLACE_INFO_REPORT_REASONS } from "../../utils/placeInfoCard";
import "./place-info-card-menu.css";

export default function PlaceInfoReportSheet({ open, onClose, onSubmit }) {
  if (!open) return null;

  return (
    <div className="place-info-sheet" role="presentation">
      <button type="button" className="place-info-sheet__backdrop" aria-label="닫기" onClick={onClose} />
      <section className="place-info-sheet__panel place-info-sheet__panel--report" role="dialog" aria-label="신고하기">
        <header className="place-info-sheet__head">
          <h3 className="place-info-sheet__title">신고하기</h3>
          <button type="button" className="place-info-sheet__close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </header>
        <p className="place-info-report__lead">신고 사유를 선택해 주세요.</p>
        <div className="place-info-report__reasons">
          {PLACE_INFO_REPORT_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              className="place-info-report__reason"
              onClick={() => onSubmit?.(reason)}
            >
              {reason}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
