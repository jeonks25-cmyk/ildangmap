import React, { useId } from "react";
import useMapCardDismissOnMapTouch from "../../hooks/useMapCardDismissOnMapTouch";
import "./map-card-container.css";

/**
 * 지도 탭 공통 카드 셸 — 크기·radius·shadow·스크롤·지도 터치 닫기 통일
 */
export default function MapCardContainer({
  open,
  onClose,
  mapContainerRef,
  title,
  onBack,
  showBack,
  lead = null,
  stickySlot = null,
  children,
  className = "",
  bodyClassName = "",
  scrollClassName = "",
  ariaLabel,
}) {
  const titleId = useId();
  const backVisible = showBack ?? Boolean(onBack);

  useMapCardDismissOnMapTouch(open, onClose, mapContainerRef);

  if (!open) return null;

  return (
    <div className="map-card-shell" role="presentation">
      <section
        className={`map-card-container${className ? ` ${className}` : ""}`}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        aria-label={ariaLabel}
      >
        <div className="map-card-container__sticky-top">
          {lead ? <div className="map-card-container__lead">{lead}</div> : null}
          <header className="map-card-container__head">
            {backVisible ? (
              <button type="button" className="map-card-container__back" onClick={onBack || onClose} aria-label="뒤로가기">
                ←
              </button>
            ) : (
              <span className="map-card-container__head-spacer" aria-hidden="true" />
            )}
            <h2 id={titleId} className="map-card-container__title">
              {title}
            </h2>
            <button type="button" className="map-card-container__close" onClick={onClose} aria-label="닫기">
              ×
            </button>
          </header>
          {stickySlot ? <div className="map-card-container__sticky-slot">{stickySlot}</div> : null}
        </div>
        <div className={`map-card-container__body${bodyClassName ? ` ${bodyClassName}` : ""}`}>
          <div className={`map-card-container__scroll${scrollClassName ? ` ${scrollClassName}` : ""}`}>{children}</div>
        </div>
      </section>
    </div>
  );
}
