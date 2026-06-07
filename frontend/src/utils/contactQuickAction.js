/**
 * 연락처 → 현장 행동 (채팅 1탭, ERP/승인 없음)
 */
import { useChatStore } from "../store/useChatStore";
import { buildFieldJobTitle, migrateJob } from "./jobModel";

export const CONTACT_QUICK_MODE = {
  INVITE: "invite",
  SHARE: "share",
  URGENT: "urgent",
};

function buildQuickMessage(job, mode) {
  const j = migrateJob(job);
  const title = buildFieldJobTitle(j);
  const pay = j.pay != null ? String(j.pay) : "";
  const addr = j.address || j.shortAddress || j.locationText || "";
  const line2 = [pay, addr].filter(Boolean).join(" · ");

  if (mode === CONTACT_QUICK_MODE.URGENT) {
    return `🔥 긴급 헬프 · ${title}\n${line2}\n지금 합류 가능하신가요?`;
  }
  if (mode === CONTACT_QUICK_MODE.INVITE) {
    return `📍 ${title}\n${line2}\n이 현장 함께해 주실 수 있나요?`;
  }
  return `📍 ${title}\n${line2}\n이 현장 참고해 주세요.`;
}

/** @returns {import('../store/useChatStore').Room|null} */
export function quickContactSiteAction(contact, job, mode = CONTACT_QUICK_MODE.INVITE) {
  if (!contact || !job) return null;
  const room = useChatStore.getState().openRoomForContact(contact);
  if (!room?.id) return null;
  useChatStore.getState().sendMessage(room.id, buildQuickMessage(job, mode), "me");
  return room;
}

export function quickActionToastMessage(contact, mode) {
  const name = contact?.name || "연락처";
  if (mode === CONTACT_QUICK_MODE.URGENT) return `${name}님께 긴급 요청을 보냈습니다`;
  if (mode === CONTACT_QUICK_MODE.INVITE) return `${name}님께 현장 초대를 보냈습니다`;
  return `${name}님께 현장을 공유했습니다`;
}

/** @returns {number} 전송 성공 수 */
export function quickContactSiteActionBatch(contacts, job, mode = CONTACT_QUICK_MODE.INVITE) {
  const list = Array.isArray(contacts) ? contacts : [];
  let sent = 0;
  list.forEach((contact) => {
    if (quickContactSiteAction(contact, job, mode)) sent += 1;
  });
  return sent;
}

export function quickBatchToastMessage(sentCount, mode) {
  const n = sentCount || 0;
  if (n <= 0) return "보내지 못했습니다";
  if (mode === CONTACT_QUICK_MODE.URGENT) return `${n}명에게 긴급 요청을 보냈습니다`;
  if (mode === CONTACT_QUICK_MODE.INVITE) return `${n}명에게 초대를 보냈습니다`;
  return `${n}명에게 현장을 공유했습니다`;
}
