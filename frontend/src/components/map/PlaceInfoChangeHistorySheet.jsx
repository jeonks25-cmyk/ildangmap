import React from "react";
import { buildPlaceChangeHistory, formatChangeHistoryAction, formatChangeHistoryWhen } from "../../utils/placeInfoCard";
import "./place-info-card-menu.css";

export default function PlaceInfoChangeHistorySheet({ open, place, onClose }) {
  if (!open || !place) return null;

  const rows = buildPlaceChangeHistory(place);

  return (
    <div className="place-info-sheet" role="presentation">
      <button type="button" className="place-info-sheet__backdrop" aria-label="닫기" onClick={onClose} />
      <section className="place-info-sheet__panel" role="dialog" aria-label="변경이력">
        <header className="place-info-sheet__head">
          <h3 className="place-info-sheet__title">변경이력</h3>
          <button type="button" className="place-info-sheet__close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </header>
        <ul className="place-info-history">
          {rows.map((row) => (
            <li key={row.id} className="place-info-history__row">
              <span className="place-info-history__when">{formatChangeHistoryWhen(row.at)}</span>
              <span className="place-info-history__who">{row.by || "—"}</span>
              <span className="place-info-history__action">{formatChangeHistoryAction(row.action)}</span>
              {row.detail ? <span className="place-info-history__detail">{row.detail}</span> : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
