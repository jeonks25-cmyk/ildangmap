import React from "react";
import { useNotifications } from "../../context/NotificationContext";

export default function NotificationBellButton({ className = "", ariaLabel = "알림 열기" }) {
  const { unreadCount, openCenter } = useNotifications();

  return (
    <button
      type="button"
      className={`notification-bell-btn${className ? ` ${className}` : ""}`}
      aria-label={ariaLabel}
      onClick={openCenter}
    >
      <span className="notification-bell-btn__icon" aria-hidden="true">
        🔔
      </span>
      {unreadCount > 0 ? <span className="notification-bell-btn__badge">{unreadCount}</span> : null}
    </button>
  );
}
