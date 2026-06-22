import { NOTIFICATION_TYPE } from "../components/notifications/notificationModel";

/**
 * @param {{ type?: string, target?: Record<string, unknown>, href?: string }} notification
 * @returns {{ pathname: string, search?: string, state?: Record<string, unknown> } | null}
 */
export function resolveNotificationRoute(notification) {
  if (!notification) return null;
  if (notification.href) {
    try {
      const url = new URL(notification.href, "https://ildangmap.local");
      return {
        pathname: url.pathname,
        search: url.search || undefined,
        state: notification.navState,
      };
    } catch (_) {
      return { pathname: notification.href, state: notification.navState };
    }
  }

  const type = notification.type || notification.kind;
  const t = notification.target || {};

  switch (type) {
    case NOTIFICATION_TYPE.CHECK_IN:
    case NOTIFICATION_TYPE.CHECK_OUT:
      if (t.scheduleId) return { pathname: `/today-field/${t.scheduleId}` };
      return { pathname: "/map" };

    case NOTIFICATION_TYPE.SCHEDULE_CREATED:
    case NOTIFICATION_TYPE.SCHEDULE_CHANGED:
    case NOTIFICATION_TYPE.SCHEDULE_CANCELLED:
      if (t.scheduleId) {
        return {
          pathname: `/schedule/field/${t.scheduleId}`,
          state: type === NOTIFICATION_TYPE.SCHEDULE_CHANGED ? { action: "change" } : undefined,
        };
      }
      return { pathname: "/schedule" };

    case NOTIFICATION_TYPE.SITE_INVITE:
      if (t.scheduleId) return { pathname: `/schedule/field/${t.scheduleId}` };
      if (t.briefingId) return { pathname: `/briefing-room/${t.briefingId}` };
      return { pathname: "/schedule" };

    case NOTIFICATION_TYPE.SITE_BOARD_POST:
      if (t.scheduleId) {
        return { pathname: `/schedule/field/${t.scheduleId}`, state: { action: "notice" } };
      }
      if (t.briefingId) return { pathname: `/briefing-room/${t.briefingId}` };
      return { pathname: "/schedule" };

    case NOTIFICATION_TYPE.MESSAGE_RECEIVED:
    case NOTIFICATION_TYPE.TEAM_JOIN_REQUEST:
    case NOTIFICATION_TYPE.TEAM_JOIN_APPROVED:
      if (t.roomId) return { pathname: `/chat/${t.roomId}` };
      if (t.jobId) return { pathname: `/jobs/${t.jobId}` };
      return { pathname: "/chat" };

    default:
      return { pathname: "/map" };
  }
}
