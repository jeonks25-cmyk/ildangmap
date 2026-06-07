import React from "react";
import MapTopBar from "../map/MapTopBar";
import "../map/map-top-bar.css";

/** 모든 탭 공통 상단바 — 좌측 타이틀 · 우측 알림 */
export default function AppTabHeader({ title, onOpenNotifications, unreadCount = 0 }) {
  return (
    <MapTopBar
      titleOnly
      title={title}
      onOpenNotifications={onOpenNotifications}
      unreadCount={unreadCount}
    />
  );
}
