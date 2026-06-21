import React, { useEffect, useId } from "react";
import { PLACE_CATEGORY_OPTIONS } from "../../constants/placeRegisterConfig";
import { getPlaceTypeIcon } from "../../utils/placeDistance";
import "./place-category-selector-sheet.css";

/**
 * + 장소 FAB — 등록 유형 선택 바텀시트.
 */
export default function PlaceCategorySelectorSheet({ open, onClose, onSelect }) {
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
    <div className="place-category-sheet-root" data-open="true">
      <button type="button" className="place-category-sheet-backdrop" aria-label="닫기" onClick={onClose} />
      <div
        className="place-category-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="place-category-sheet-panel__head">
          <h2 id={titleId} className="place-category-sheet-panel__title">
            어떤 장소를 등록할까요?
          </h2>
          <button type="button" className="place-category-sheet-panel__close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        <ul className="place-category-sheet-menu" role="menu">
          {PLACE_CATEGORY_OPTIONS.map(({ type, label, desc }) => (
            <li key={type} className="place-category-sheet-menu__item" role="none">
              <button
                type="button"
                className="place-category-sheet-menu__btn"
                role="menuitem"
                onClick={() => {
                  onSelect?.(type);
                  onClose?.();
                }}
              >
                <span className="place-category-sheet-menu__icon" aria-hidden="true">
                  {getPlaceTypeIcon(type)}
                </span>
                <span className="place-category-sheet-menu__text">
                  <strong>{label}</strong>
                  <small>{desc}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
