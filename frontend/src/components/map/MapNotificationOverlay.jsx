import React, { useCallback } from "react";
import MapCardContainer from "./MapCardContainer";
import { notificationRowIcon } from "../notifications/notificationModel";
import "./map-place-detail-card.css";

function NotificationDetailBody({ item }) {
  if (!item) return null;

  return (
    <div className="place-detail-card__info">
      <h3 className="place-detail-card__place-title">
        <span className="place-detail-card__place-icon" aria-hidden>
          {notificationRowIcon(item.kind)}
        </span>
        {item.primaryLine}
      </h3>
      <dl className="place-detail-card__meta">
        <div className="place-detail-card__meta-row">
          <dt>분류</dt>
          <dd>{item.sectionLabel}</dd>
        </div>
        {item.secondaryLine ? (
          <div className="place-detail-card__meta-row">
            <dt>내용</dt>
            <dd>{item.secondaryLine}</dd>
          </div>
        ) : null}
        <div className="place-detail-card__meta-row">
          <dt>시간</dt>
          <dd>{item.timeLabel}</dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * 알림센터 — MapPlaceOverlay와 동일 MapCardContainer (목록 ↔ 상세)
 */
export default function MapNotificationOverlay({
  open,
  mode = "list",
  detailNotification = null,
  notifications = [],
  mapContainerRef,
  onClose,
  onBack,
  onSelectNotification,
}) {
  const handleBackClick = useCallback(() => {
    if (mode === "detail") {
      onBack?.();
      return;
    }
    onClose?.();
  }, [mode, onBack, onClose]);

  if (!open) return null;

  const headerTitle = mode === "detail" ? detailNotification?.sectionLabel || "알림" : "알림";

  if (mode === "detail") {
    return (
      <MapCardContainer
        open={open}
        onClose={onClose}
        mapContainerRef={mapContainerRef}
        title={headerTitle}
        onBack={handleBackClick}
        showBack
        className="map-place-overlay-card map-place-overlay-card--detail"
        scrollClassName="map-place-overlay-card__scroll--detail"
        ariaLabel="알림 상세"
      >
        <NotificationDetailBody item={detailNotification} />
      </MapCardContainer>
    );
  }

  return (
    <MapCardContainer
      open={open}
      onClose={onClose}
      mapContainerRef={mapContainerRef}
      title={headerTitle}
      onBack={handleBackClick}
      showBack
      className="map-place-overlay-card"
      ariaLabel="알림 목록"
    >
      <div role="list" aria-label="현장 알림 목록">
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
                {notificationRowIcon(item.kind)}
              </span>
              <span className="map-place-overlay-row__body">
                <span className="map-place-overlay-row__title">{item.primaryLine}</span>
                <span className="map-place-overlay-row__desc">{item.sectionLabel}</span>
              </span>
              <span className="map-place-overlay-row__distance map-place-overlay-row__time">{item.timeLabel}</span>
            </button>
          ))
        ) : (
          <p className="map-place-overlay__empty">현장 알림이 없습니다.</p>
        )}
      </div>
    </MapCardContainer>
  );
}
