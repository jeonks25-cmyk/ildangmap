import { useCallback, useEffect, useMemo } from "react";
import { useUiStore } from "../store/useUiStore";
import { useNotificationStore } from "../store/useNotificationStore";
import { useSettlementStore } from "../store/useSettlementStore";
import { useChatStore } from "../store/useChatStore";
import { useUserStore } from "../store/useUserStore";
import {
  NOTIFICATION_SETTING_OPTIONS,
  decorateNotification,
  defaultNotificationSettings,
  isKnownNotificationType,
  isNotificationTypeEnabled,
} from "../components/notifications/notificationModel";
import { deriveNotificationsFromSources } from "../utils/notificationSources";

export { NOTIFICATION_SETTING_OPTIONS };

function formatRelativeTime(iso, now = new Date()) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "방금 전";
  const diffMinutes = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60000));
  if (diffMinutes < 1) return "방금 전";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}일 전`;
}

export function NotificationProvider({ children }) {
  const sessionUserId = useUserStore((s) => s.session?.user?.id ?? s.profile?.userId ?? null);
  const schedules = useSettlementStore((s) => s.schedules);
  const chatRooms = useChatStore((s) => s.rooms);
  const setNotificationUserId = useNotificationStore((s) => s.setNotificationUserId);
  const mergeDerivedNotifications = useNotificationStore((s) => s.mergeDerivedNotifications);

  useEffect(() => {
    if (sessionUserId != null) {
      setNotificationUserId(sessionUserId);
    }
  }, [sessionUserId, setNotificationUserId]);

  useEffect(() => {
    if (sessionUserId == null) return;
    const derived = deriveNotificationsFromSources({
      viewerId: sessionUserId,
      schedules,
      chatRooms,
    });
    mergeDerivedNotifications(derived);
  }, [sessionUserId, schedules, chatRooms, mergeDerivedNotifications]);

  return children;
}

export function useNotifications() {
  const events = useNotificationStore((s) => s.events);
  const open = useUiStore((state) => state.notificationOpen);
  const view = useUiStore((state) => state.notificationView);
  const readIds = useUiStore((state) => state.notificationReadIds);
  const notificationSettings = useUiStore((state) => state.notificationSettings);
  const openCenter = useUiStore((state) => state.openNotificationCenter);
  const closeCenter = useUiStore((state) => state.closeNotificationCenter);
  const openSettings = useUiStore((state) => state.openNotificationSettings);
  const backToCenter = useUiStore((state) => state.backToNotificationCenter);
  const toggleRead = useUiStore((state) => state.toggleNotificationRead);
  const markAllNotificationsRead = useUiStore((state) => state.markAllNotificationsRead);
  const toggleSetting = useUiStore((state) => state.toggleNotificationSetting);

  const settings = useMemo(
    () => ({ ...defaultNotificationSettings(), ...(notificationSettings || {}) }),
    [notificationSettings]
  );

  const notifications = useMemo(() => {
    const raw = Array.isArray(events) ? events : [];
    return raw
      .map((item) => decorateNotification(item))
      .filter((item) => isKnownNotificationType(item))
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  }, [events]);

  const visibleNotifications = useMemo(
    () => notifications.filter((item) => isNotificationTypeEnabled(settings, item)),
    [notifications, settings]
  );

  const unreadCount = useMemo(
    () => visibleNotifications.filter((item) => !readIds.includes(item.id)).length,
    [readIds, visibleNotifications]
  );

  const markAllRead = useCallback(
    () => markAllNotificationsRead(visibleNotifications.map((item) => item.id)),
    [markAllNotificationsRead, visibleNotifications]
  );

  return {
    open,
    view,
    notifications: visibleNotifications.map((item) => ({
      ...item,
      timeLabel: formatRelativeTime(item.createdAt, new Date()),
      isRead: readIds.includes(item.id),
    })),
    settings,
    unreadCount,
    openCenter,
    closeCenter,
    openSettings,
    backToCenter,
    toggleRead,
    markAllRead,
    toggleSetting,
  };
}
