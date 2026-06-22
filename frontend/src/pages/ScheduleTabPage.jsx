import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppTabHeader from "../components/layout/AppTabHeader";
import MapNotificationOverlay from "../components/map/MapNotificationOverlay";
import { useTabNotificationOverlay } from "../hooks/useTabNotificationOverlay";
import ScheduleMonthPage from "./ScheduleMonthPage";
import "../styles/schedule-page-mobile.css";

/** 일정 탭 — 단일 월간+목록 화면 */
export default function ScheduleTabPage() {
  const overlay = useTabNotificationOverlay();

  return (
    <div
      ref={overlay.pageRef}
      className={`schedule-tab-page schedule-tab-page--oyaji tab-page-shell${overlay.notificationOverlayOpen ? " schedule-tab-page--overlay-open" : ""}`}
    >
      <AppTabHeader
        title="일정"
        onOpenNotifications={overlay.handleOpenNotificationCenter}
        unreadCount={overlay.unreadCount}
      />
      <div className="schedule-tab-page__body tab-page-shell__body">
        <Routes>
          <Route index element={<ScheduleMonthPage />} />
          <Route path="day/*" element={<Navigate to="/schedule" replace />} />
        </Routes>
      </div>
      <MapNotificationOverlay
        open={overlay.notificationOverlayOpen}
        notifications={overlay.notificationItems}
        mapContainerRef={overlay.pageRef}
        onClose={overlay.handleCloseNotificationOverlay}
        onSelectNotification={overlay.handleNotificationOverlaySelect}
      />
    </div>
  );
}
