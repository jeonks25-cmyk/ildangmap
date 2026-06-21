import React, { useEffect, useId } from "react";
import { openMapNavigationOption } from "../../utils/mapNavigation";
import "./map-directions-sheet.css";

/**
 * 길찾기 앱 선택 바텀시트 — 네이버·카카오 등 (확장 가능).
 */
export default function MapDirectionsSheet({ open, title = "길찾기", options = [], onClose }) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="map-directions-sheet-root" data-open="true">
      <button type="button" className="map-directions-sheet-backdrop" aria-label="닫기" onClick={onClose} />
      <div
        className="map-directions-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="map-directions-sheet-panel__head">
          <h2 id={titleId} className="map-directions-sheet-panel__title">
            {title}
          </h2>
          <button type="button" className="map-directions-sheet-panel__close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        <ul className="map-directions-sheet-menu" role="menu">
          {options.map((option) => (
            <li key={option.id} className="map-directions-sheet-menu__item" role="none">
              <button
                type="button"
                className={`map-directions-sheet-menu__btn map-directions-sheet-menu__btn--${option.id}`}
                role="menuitem"
                onClick={() => {
                  openMapNavigationOption(option);
                  onClose?.();
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
