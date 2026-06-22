import { create } from "zustand";
import { persist } from "zustand/middleware";
import { NOTIFICATION_TYPE, decorateNotification } from "../components/notifications/notificationModel";
import { createSafeJsonStorage, pickPersistedStoreState } from "./storeUtils";

const STORE_KEY = "ildangmap_notification_events_v1";
const MAX_EVENTS = 120;

function nowIso() {
  return new Date().toISOString();
}

function stableId(parts) {
  return parts.filter(Boolean).join(":");
}

/**
 * @param {{
 *   id?: string,
 *   type: string,
 *   title?: string,
 *   body?: string,
 *   primaryLine?: string,
 *   secondaryLine?: string,
 *   createdAt?: string,
 *   updatedAt?: string,
 *   actorUserId?: number|null,
 *   actorName?: string,
 *   target?: Record<string, unknown>,
 *   href?: string,
 *   navState?: Record<string, unknown>,
 *   recipientUserId?: number|null,
 *   dedupeKey?: string,
 * }} payload
 */
function normalizeEvent(payload) {
  if (!payload?.type) return null;
  const createdAt = payload.createdAt || nowIso();
  const event = decorateNotification({
    id: payload.id || stableId(["notif", payload.type, payload.dedupeKey || createdAt]),
    type: payload.type,
    title: payload.title,
    body: payload.body,
    primaryLine: payload.primaryLine || payload.title,
    secondaryLine: payload.secondaryLine != null ? payload.secondaryLine : payload.body || "",
    createdAt,
    updatedAt: payload.updatedAt || createdAt,
    actorUserId: payload.actorUserId ?? null,
    actorName: payload.actorName || "",
    target: payload.target && typeof payload.target === "object" ? payload.target : {},
    href: payload.href || "",
    navState: payload.navState,
    recipientUserId: payload.recipientUserId ?? null,
    dedupeKey: payload.dedupeKey || "",
  });
  return event;
}

export const useNotificationStore = create(
  persist(
    (set, get) => ({
      events: [],
      notificationUserId: null,

      resetNotifications: () => set({ events: [], notificationUserId: null }),

      setNotificationUserId: (userId) => {
        const uid = userId != null && userId !== "" ? String(userId) : null;
        if (get().notificationUserId && get().notificationUserId !== uid) {
          set({ events: [], notificationUserId: uid });
          return;
        }
        set({ notificationUserId: uid });
      },

      pushNotification: (payload) => {
        const event = normalizeEvent(payload);
        if (!event) return null;
        set((state) => {
          const prev = Array.isArray(state.events) ? state.events : [];
          const dedupe = event.dedupeKey || event.id;
          const withoutDup = prev.filter((row) => (row.dedupeKey || row.id) !== dedupe);
          return { events: [event, ...withoutDup].slice(0, MAX_EVENTS) };
        });
        return event;
      },

      upsertNotification: (payload) => get().pushNotification(payload),

      mergeDerivedNotifications: (derivedRows) => {
        const rows = Array.isArray(derivedRows) ? derivedRows : [];
        if (!rows.length) return;
        set((state) => {
          const prev = Array.isArray(state.events) ? state.events : [];
          const map = new Map(prev.map((row) => [row.dedupeKey || row.id, row]));
          rows.forEach((raw) => {
            const event = normalizeEvent(raw);
            if (!event) return;
            map.set(event.dedupeKey || event.id, event);
          });
          return {
            events: Array.from(map.values())
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, MAX_EVENTS),
          };
        });
      },

      listEvents: () => (Array.isArray(get().events) ? get().events : []),
    }),
    {
      name: STORE_KEY,
      storage: createSafeJsonStorage(),
      partialize: (state) => pickPersistedStoreState(state, ["events", "notificationUserId"]),
    }
  )
);

export function emitCheckInNotification({ actorName, fieldLabel, scheduleId, checkInId, recipientUserId }) {
  return useNotificationStore.getState().pushNotification({
    type: NOTIFICATION_TYPE.CHECK_IN,
    dedupeKey: stableId(["check_in", checkInId]),
    primaryLine: `${actorName || "팀원"} 출근`,
    secondaryLine: fieldLabel || "",
    actorName,
    target: { scheduleId, checkInId },
    recipientUserId,
  });
}

export function emitCheckOutNotification({ actorName, fieldLabel, scheduleId, checkInId, recipientUserId }) {
  return useNotificationStore.getState().pushNotification({
    type: NOTIFICATION_TYPE.CHECK_OUT,
    dedupeKey: stableId(["check_out", checkInId]),
    primaryLine: `${actorName || "팀원"} 퇴근`,
    secondaryLine: fieldLabel || "",
    actorName,
    target: { scheduleId, checkInId },
    recipientUserId,
  });
}

export function emitScheduleCreatedNotification({ schedule, actorName, recipientUserId }) {
  if (!schedule?.id) return null;
  return useNotificationStore.getState().pushNotification({
    type: NOTIFICATION_TYPE.SCHEDULE_CREATED,
    dedupeKey: stableId(["schedule_created", schedule.id]),
    primaryLine: "일정이 생성되었습니다",
    secondaryLine: `${schedule.title || "현장"} · ${String(schedule.workDate || "").slice(0, 10)}`,
    actorName,
    target: { scheduleId: schedule.id, briefingId: schedule.briefingId || "" },
    recipientUserId,
  });
}

export function emitScheduleChangedNotification({ schedule, summary, requestId, actorName, recipientUserId }) {
  if (!schedule?.id) return null;
  return useNotificationStore.getState().pushNotification({
    type: NOTIFICATION_TYPE.SCHEDULE_CHANGED,
    dedupeKey: stableId(["schedule_changed", requestId || schedule.id]),
    primaryLine: "일정 변경",
    secondaryLine: summary || schedule.title || "",
    actorName,
    target: { scheduleId: schedule.id, briefingId: schedule.briefingId || "", requestId },
    recipientUserId,
  });
}

export function emitScheduleCancelledNotification({ schedule, actorName, recipientUserId }) {
  if (!schedule?.id) return null;
  return useNotificationStore.getState().pushNotification({
    type: NOTIFICATION_TYPE.SCHEDULE_CANCELLED,
    dedupeKey: stableId(["schedule_cancelled", schedule.id]),
    primaryLine: "일정이 취소되었습니다",
    secondaryLine: schedule.title || "",
    actorName,
    target: { scheduleId: schedule.id, briefingId: schedule.briefingId || "" },
    recipientUserId,
  });
}

export function emitSiteInviteNotification({ invite, recipientUserId }) {
  if (!invite?.id) return null;
  return useNotificationStore.getState().pushNotification({
    type: NOTIFICATION_TYPE.SITE_INVITE,
    dedupeKey: stableId(["site_invite", invite.id]),
    primaryLine: `${invite.fromName || "현장 소장"}님의 현장 초대`,
    secondaryLine: `${invite.title || "현장"} · ${invite.workDate || ""}`,
    actorName: invite.fromName,
    actorUserId: invite.fromUserId,
    target: {
      scheduleId: invite.scheduleId,
      briefingId: invite.briefingId,
      inviteId: invite.id,
    },
    recipientUserId,
  });
}

export function emitSiteBoardPostNotification({ post, schedule, briefingId, actorName, recipientUserId }) {
  if (post?.postType !== "notice" && post?.postType !== "general") return null;
  return emitSiteBoardNoticeNotification({
    actorName: actorName || post?.authorName,
    actorUserId: post?.authorUserId,
    preview: post?.body || schedule?.title || "",
    target: {
      scheduleId: schedule?.id,
      briefingId: briefingId || schedule?.briefingId || post?.briefingId,
      postId: post?.id,
    },
    recipientUserId,
  });
}

export function emitSiteBoardNoticeNotification({ actorName, actorUserId, preview, target, recipientUserId }) {
  return useNotificationStore.getState().pushNotification({
    type: NOTIFICATION_TYPE.SITE_BOARD_POST,
    dedupeKey: stableId(["site_board_notice", target?.postId, target?.scheduleId]),
    primaryLine: "현장 게시판 · 공지",
    secondaryLine: preview || "",
    actorName,
    actorUserId,
    target,
    recipientUserId,
  });
}

export function emitSiteBoardCommentNotification({ actorName, actorUserId, preview, target, recipientUserId }) {
  return useNotificationStore.getState().pushNotification({
    type: NOTIFICATION_TYPE.SITE_BOARD_POST,
    dedupeKey: stableId(["site_board_comment", target?.commentId, target?.postId]),
    primaryLine: "내 글에 댓글",
    secondaryLine: preview || "",
    actorName,
    actorUserId,
    target,
    recipientUserId,
  });
}

export function emitSiteBoardMentionNotification({ actorName, actorUserId, preview, target, recipientUserId }) {
  return useNotificationStore.getState().pushNotification({
    type: NOTIFICATION_TYPE.SITE_BOARD_POST,
    dedupeKey: stableId(["site_board_mention", target?.commentId, target?.postId, actorUserId]),
    primaryLine: "현장 게시판 · @멘션",
    secondaryLine: preview || "",
    actorName,
    actorUserId,
    target,
    recipientUserId,
  });
}

export function emitMessageReceivedNotification({ room, message, recipientUserId }) {
  if (!room?.id) return null;
  const preview = String(message?.text || room.lastMessage || "").trim();
  return useNotificationStore.getState().pushNotification({
    type: NOTIFICATION_TYPE.MESSAGE_RECEIVED,
    dedupeKey: stableId(["message", room.id, message?.id || room.updatedAt]),
    primaryLine: `${room.ownerName || "상대"} · 새 메시지`,
    secondaryLine: preview,
    target: { roomId: room.id, jobId: room.jobId, contactId: room.contactId },
    recipientUserId,
  });
}

export function emitTeamJoinRequestNotification({ room, applicantName, recipientUserId }) {
  if (!room?.id) return null;
  return useNotificationStore.getState().pushNotification({
    type: NOTIFICATION_TYPE.TEAM_JOIN_REQUEST,
    dedupeKey: stableId(["team_join_request", room.id]),
    primaryLine: `${applicantName || "기술자"} 참여 요청`,
    secondaryLine: room.jobTitle || room.shortRegion || "",
    target: { roomId: room.id, jobId: room.jobId },
    recipientUserId,
  });
}

export function emitTeamJoinApprovedNotification({ room, ownerName, recipientUserId }) {
  if (!room?.id) return null;
  return useNotificationStore.getState().pushNotification({
    type: NOTIFICATION_TYPE.TEAM_JOIN_APPROVED,
    dedupeKey: stableId(["team_join_approved", room.id]),
    primaryLine: `${ownerName || "오야지"} 참여 승인`,
    secondaryLine: room.jobTitle || room.shortRegion || "",
    target: { roomId: room.id, jobId: room.jobId },
    recipientUserId,
  });
}
