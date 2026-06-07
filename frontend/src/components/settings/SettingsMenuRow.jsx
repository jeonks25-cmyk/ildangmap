import React from "react";

export default function SettingsMenuRow({ icon, label, value = null, showChevron = true, onClick, disabled = false }) {
  const interactive = Boolean(onClick) && showChevron;

  const content = (
    <>
      <span className="settings-menu-row__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="settings-menu-row__main">
        <span className="settings-menu-row__label">{label}</span>
        {value ? <span className="settings-menu-row__value">{value}</span> : null}
      </span>
      {showChevron && interactive ? (
        <span className="settings-menu-row__chev" aria-hidden="true">
          ›
        </span>
      ) : null}
    </>
  );

  if (!interactive) {
    return (
      <div className="settings-menu-row settings-menu-row--static" role="listitem">
        {content}
      </div>
    );
  }

  return (
    <button type="button" className="settings-menu-row settings-menu-row--action" onClick={onClick} role="listitem">
      {content}
    </button>
  );
}
