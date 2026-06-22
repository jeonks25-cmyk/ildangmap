import { NOTIFICATION_TYPE } from "../components/notifications/notificationModel";
import { loadPendingInvitesForUser } from "./scheduleInviteInbox";
import { readAllFieldOps } from "./scheduleFieldOpsStorage";

function stableId(parts) {
  return parts.filter(Boolean).join(":");
}

/**
 * 로그인 사용자 기준 실데이터에서 알림 이벤트를 보강한다 (데모 시드 없음).
 * @param {{ viewerId?: number|null, schedules?: unknown[], chatRooms?: unknown[] }} ctx
 */
export function deriveNotificationsFromSources({ viewerId, schedules = [], chatRooms = [] } = {}) {
  const uid = Number(viewerId);
  if (!Number.isFinite(uid) || uid <= 0) return [];

  const derived = [];
  const scheduleList = Array.isArray(schedules) ? schedules.filter(Boolean) : [];

  loadPendingInvitesForUser(uid).forEach((invite) => {
    derived.push({
      id: stableId(["derived", "site_invite", invite.id]),
      type: NOTIFICATION_TYPE.SITE_INVITE,
      dedupeKey: stableId(["site_invite", invite.id]),
      primaryLine: `${invite.fromName || "현장 소장"}님의 현장 초대`,
      secondaryLine: `${invite.title || "현장"} · ${invite.workDate || ""}`,
      actorName: invite.fromName,
      actorUserId: invite.fromUserId,
      createdAt: invite.createdAt || new Date().toISOString(),
      target: {
        scheduleId: invite.scheduleId,
        briefingId: invite.briefingId,
        inviteId: invite.id,
      },
      recipientUserId: uid,
    });
  });

  const ops = readAllFieldOps();
  const changeRequests = ops?.changeRequests || {};
  scheduleList.forEach((schedule) => {
    const sid = String(schedule.id || "");
    const rows = Array.isArray(changeRequests[sid]) ? changeRequests[sid] : [];
    const pending = rows.find((r) => r && r.status === "pending");
    if (!pending) return;
    const ownerId = Number(schedule.createdByUserId);
    const isOwner = ownerId === uid;
    const isParticipant =
      schedule.acceptedParticipantUserId === uid ||
      (Array.isArray(schedule.scheduleInvites) &&
        schedule.scheduleInvites.some(
          (iv) =>
            Number(iv.userId) === uid &&
            ["accepted", "confirmed", "pending"].includes(String(iv.status || "").toLowerCase())
        ));
    if (isOwner || !isParticipant) return;
    derived.push({
      id: stableId(["derived", "schedule_changed", pending.id]),
      type: NOTIFICATION_TYPE.SCHEDULE_CHANGED,
      dedupeKey: stableId(["schedule_changed", pending.id]),
      primaryLine: "일정 변경",
      secondaryLine: pending.summary || schedule.title || "",
      createdAt: pending.createdAt || new Date().toISOString(),
      target: {
        scheduleId: schedule.id,
        briefingId: pending.briefingId || schedule.briefingId,
        requestId: pending.id,
      },
      recipientUserId: uid,
    });
  });

  (Array.isArray(chatRooms) ? chatRooms : []).forEach((room) => {
    if (!room?.id) return;
    const unread = Number(room.unreadCount || 0);
    if (unread > 0) {
      derived.push({
        id: stableId(["derived", "message", room.id, room.updatedAt]),
        type: NOTIFICATION_TYPE.MESSAGE_RECEIVED,
        dedupeKey: stableId(["message", room.id, room.updatedAt]),
        primaryLine: `${room.ownerName || "상대"} · 새 메시지`,
        secondaryLine: String(room.lastMessage || "").trim(),
        createdAt: room.updatedAt || new Date().toISOString(),
        target: { roomId: room.id, jobId: room.jobId, contactId: room.contactId },
        recipientUserId: uid,
      });
    }
  });

  return derived;
}
