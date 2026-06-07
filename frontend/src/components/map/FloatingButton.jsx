import React from "react";
import "./floating-button.css";

/**
 * 지도 플로팅 버튼 — 목록 / 내 위치 / + 공통 스타일
 */
export default function FloatingButton({
  variant = "icon",
  icon = null,
  label = null,
  children = null,
  className = "",
  open = false,
  busy = false,
  ...rest
}) {
  const variantClass = variant === "labeled" ? "map-floating-btn--labeled" : "map-floating-btn--icon";

  return (
    <button
      type="button"
      className={[
        "map-floating-btn",
        variantClass,
        open ? "is-open" : "",
        busy ? "is-busy" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {icon ? <span className="map-floating-btn__icon">{icon}</span> : null}
      {label ? <span className="map-floating-btn__label">{label}</span> : null}
      {children}
    </button>
  );
}

/** ☰ 목록 아이콘 */
export function FloatingButtonListIcon() {
  return (
    <svg className="map-floating-btn__svg" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

/** ＋ 장소 등록 아이콘 */
export function FloatingButtonAddIcon() {
  return (
    <svg className="map-floating-btn__svg map-floating-btn__svg--add" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** ⌖ 내 위치 아이콘 */
export function FloatingButtonLocationIcon() {
  return (
    <svg className="map-floating-btn__svg" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="7.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2.75" fill="currentColor" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M12 3.25v2.5M12 18.25v2.5M3.25 12h2.5M18.25 12h2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
