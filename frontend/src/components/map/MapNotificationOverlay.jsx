import React from "react";
import MapCardContainer from "./MapCardContainer";
import { notificationRowIcon } from "../notifications/notificationModel";
import "./map-place-detail-card.css";

/**
 * 알림센터 — 목록만 표시, 행 클릭 시 해당 화면으로 이동
 */
export default function MapNotificationOverlay({
  open,
  notifications = [],
  mapContainerRef,
  onClose,
  onSelectNotification,
}) {
  if (!open) return null;

  return (
    <MapCardContainer
      open={open}
      onClose={onClose}
      mapContainerRef={mapContainerRef}
      title="알림"
      onBack={onClose}
      showBack
      className="map-place-overlay-card"
      ariaLabel="알림 목록"
    >
      <div role="list" aria-label="알림 목록">
        {notifications.length ? (
          notifications.map((item) => (
            <button
              key={item.id}
              type="button"
              role="listitem"
              className={`map-place-overlay-row map-place-overlay-row--notification${item.isRead ? " is-read" : " is-unread"}`}
              onClick={() => onSelectNotification?.(item)}
            >
              <span className="map-place-overlay-row__rank" aria-hidden="true">
                {!item.isRead ? <span className="map-place-overlay-row__unread-dot" /> : null}
              </span>
              <span className="map-place-overlay-row__icon" aria-hidden="true">
                {notificationRowIcon(item.type || item.kind)}
              </span>
              <span className="map-place-overlay-row__body">
                <span className="map-place-overlay-row__title">{item.primaryLine}</span>
                <span className="map-place-overlay-row__desc">
                  {item.secondaryLine || item.sectionLabel}
                </span>
              </span>
              <span className="map-place-overlay-row__distance map-place-overlay-row__time">{item.timeLabel}</span>
            </button>
          ))
        ) : (
          <p className="map-place-overlay__empty">새 알림이 없습니다.</p>
        )}
      </div>
    </MapCardContainer>
  );
}
