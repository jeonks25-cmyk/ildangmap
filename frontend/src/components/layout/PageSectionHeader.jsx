import React from "react";

/**
 * 탭 상단 공통 헤더 — 연락처/일정/설정/지도 동일 spacing
 */
export default function PageSectionHeader({ title, lead, actions, className = "" }) {
  const headClass = ["app-page-head", className].filter(Boolean).join(" ");

  if (actions) {
    return (
      <header className={headClass}>
        <div className="app-page-head__row">
          <div className="app-page-head__text">
            <h1 className="app-page-head__title">{title}</h1>
            {lead ? <p className="app-page-head__lead">{lead}</p> : null}
          </div>
          <div className="app-page-head__actions" role="group">
            {actions}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={headClass}>
      <h1 className="app-page-head__title">{title}</h1>
      {lead ? <p className="app-page-head__lead">{lead}</p> : null}
    </header>
  );
}
