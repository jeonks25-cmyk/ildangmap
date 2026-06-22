import { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import { resolveNotificationRoute } from "../utils/notificationNavigation";

/** 알림 클릭 → 읽음 처리 + 해당 화면 이동 */
export function useNotificationNavigation() {
  const navigate = useNavigate();
  const { toggleRead, closeCenter } = useNotifications();

  const handleNotificationClick = useCallback(
    (item) => {
      if (!item) return;
      if (!item.isRead) toggleRead(item.id);
      const route = resolveNotificationRoute(item);
      closeCenter();
      if (route?.pathname) {
        navigate(route.pathname + (route.search || ""), { state: route.state });
      }
    },
    [closeCenter, navigate, toggleRead]
  );

  return { handleNotificationClick };
}

/** 탭 공통 알림센터 오버레이 */
export function useTabNotificationOverlay() {
  const pageRef = useRef(null);
  const {
    open: notificationOverlayOpen,
    openCenter,
    closeCenter,
    notifications: notificationItems,
    unreadCount,
  } = useNotifications();
  const { handleNotificationClick } = useNotificationNavigation();

  const handleOpenNotificationCenter = useCallback(() => {
    openCenter();
  }, [openCenter]);

  const handleCloseNotificationOverlay = useCallback(() => {
    closeCenter();
  }, [closeCenter]);

  return {
    pageRef,
    notificationOverlayOpen,
    notificationItems,
    unreadCount,
    handleOpenNotificationCenter,
    handleCloseNotificationOverlay,
    handleNotificationOverlaySelect: handleNotificationClick,
  };
}
