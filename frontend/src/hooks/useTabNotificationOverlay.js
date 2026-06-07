import { useCallback, useEffect, useRef, useState } from "react";
import { useNotifications } from "../context/NotificationContext";

/** 탭 공통 알림센터 오버레이 상태 */
export function useTabNotificationOverlay() {
  const pageRef = useRef(null);
  const {
    open: notificationOverlayOpen,
    openCenter,
    closeCenter,
    notifications: notificationItems,
    toggleRead: toggleNotificationRead,
    unreadCount,
  } = useNotifications();
  const [notificationOverlayMode, setNotificationOverlayMode] = useState("list");
  const [notificationOverlayDetail, setNotificationOverlayDetail] = useState(null);

  const handleOpenNotificationCenter = useCallback(() => {
    setNotificationOverlayMode("list");
    setNotificationOverlayDetail(null);
    openCenter();
  }, [openCenter]);

  const handleCloseNotificationOverlay = useCallback(() => {
    closeCenter();
    setNotificationOverlayMode("list");
    setNotificationOverlayDetail(null);
  }, [closeCenter]);

  const handleNotificationOverlayBack = useCallback(() => {
    setNotificationOverlayMode("list");
    setNotificationOverlayDetail(null);
  }, []);

  const handleNotificationOverlaySelect = useCallback(
    (item) => {
      if (!item) return;
      if (!item.isRead) toggleNotificationRead(item.id);
      setNotificationOverlayDetail(item);
      setNotificationOverlayMode("detail");
    },
    [toggleNotificationRead]
  );

  useEffect(() => {
    if (!notificationOverlayOpen) {
      setNotificationOverlayMode("list");
      setNotificationOverlayDetail(null);
    }
  }, [notificationOverlayOpen]);

  return {
    pageRef,
    notificationOverlayOpen,
    notificationOverlayMode,
    notificationOverlayDetail,
    notificationItems,
    unreadCount,
    handleOpenNotificationCenter,
    handleCloseNotificationOverlay,
    handleNotificationOverlayBack,
    handleNotificationOverlaySelect,
  };
}
