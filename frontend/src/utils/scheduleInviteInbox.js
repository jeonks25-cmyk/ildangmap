import { writeJsonStorage } from "../store/storeUtils";
import { emitSiteInviteNotification } from "../store/useNotificationStore";

export const SCHEDULE_INVITE_INBOX_KEY = "ildangmap_schedule_invite_inbox_v1";

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (_) {
    return fallback;
  }
}

export function loadAllScheduleInvites() {
  return readJson(SCHEDULE_INVITE_INBOX_KEY, []);
}

export function saveAllScheduleInvites(rows) {
  writeJsonStorage(SCHEDULE_INVITE_INBOX_KEY, Array.isArray(rows) ? rows : []);
}

/**
 * @param {{ scheduleId: string, briefingId: string, fromUserId: number, fromName: string, title: string, workDate: string, invitees: Array<{ userId: number, name: string }> }} payload
 */
export function appendScheduleInvites(payload) {
  const list = loadAllScheduleInvites();
  const base = Date.now();
  const { scheduleId, briefingId, fromUserId, fromName, title, workDate, invitees } = payload;
  for (let i = 0; i < invitees.length; i += 1) {
    const inv = invitees[i];
    if (!inv || !Number.isFinite(Number(inv.userId))) continue;
    const row = {
      id: `inv-${base}-${i}-${inv.userId}`,
      scheduleId,
      briefingId,
      toUserId: Number(inv.userId),
      fromUserId: Number(fromUserId),
      fromName: String(fromName || "").trim() || "오야지",
      title: String(title || "").trim(),
      workDate: String(workDate || "").trim(),
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    list.push(row);
    emitSiteInviteNotification({ invite: row, recipientUserId: row.toUserId });
  }
  saveAllScheduleInvites(list);
}

export function loadPendingInvitesForUser(userId) {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) return [];
  return loadAllScheduleInvites().filter((r) => r && r.toUserId === uid && r.status === "pending");
}

export function findInviteById(inviteId) {
  return loadAllScheduleInvites().find((r) => r && r.id === inviteId) || null;
}

export function markInviteAccepted(inviteId) {
  const list = loadAllScheduleInvites();
  const next = list.map((r) => (r && r.id === inviteId ? { ...r, status: "accepted" } : r));
  saveAllScheduleInvites(next);
  return next.find((r) => r && r.id === inviteId) || null;
}

export function markInviteDeclined(inviteId) {
  const list = loadAllScheduleInvites();
  const next = list.map((r) => (r && r.id === inviteId ? { ...r, status: "declined" } : r));
  saveAllScheduleInvites(next);
  return next.find((r) => r && r.id === inviteId) || null;
}

/** scheduleId + 수신자 userId 로 대기중 초대 1건을 찾는다(알림 카드 응답용). */
export function findPendingInviteByScheduleUser(scheduleId, userId) {
  const uid = Number(userId);
  return (
    loadAllScheduleInvites().find(
      (r) => r && String(r.scheduleId) === String(scheduleId) && r.toUserId === uid && r.status === "pending"
    ) || null
  );
}
