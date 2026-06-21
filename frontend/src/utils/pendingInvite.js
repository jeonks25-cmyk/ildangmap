/**
 * 초대 링크(/invite?ref=&contact=&group=) 파라미터를 가입 완료 시점까지 보관한다.
 * 로그인·온보딩 단계를 거치며 URL이 바뀌어도 살아남도록 localStorage에 저장.
 * 신규 데이터 모델 아님 — 가입 직후 1회 소비하고 지운다.
 */
import { buildContactsList, useContactsStore } from "../store/useContactsStore";
import { contactStableUserId } from "./fieldContactsMock";
const PENDING_INVITE_KEY = "ildangmap_pending_invite_v1";

function parseSearch(search) {
  try {
    const params = new URLSearchParams(search || "");
    const ref = params.get("ref");
    const contactId = params.get("contact");
    const groupId = params.get("group");
    if (!ref && !contactId && !groupId) return null;
    return {
      ref: ref || null,
      contactId: contactId || null,
      groupId: groupId || null,
      capturedAt: new Date().toISOString(),
    };
  } catch (_) {
    return null;
  }
}

/** 현재 URL(쿼리 또는 #/invite?... 해시 라우팅)에서 초대 파라미터를 찾아 저장 */
export function captureInviteFromUrl(searchOverride) {
  if (typeof window === "undefined") return null;
  let invite = parseSearch(searchOverride ?? window.location.search);
  if (!invite && window.location.hash.includes("?")) {
    invite = parseSearch(window.location.hash.slice(window.location.hash.indexOf("?")));
  }
  if (!invite) return null;
  try {
    localStorage.setItem(PENDING_INVITE_KEY, JSON.stringify(invite));
  } catch (_) {
    /* noop */
  }
  return invite;
}

/** ref(초대한 userId)로 표시 이름 추정 — 연락처·시드 데이터 우선 */
export function resolveInviterDisplayName(refUserId) {
  const ref = Number(refUserId);
  if (!Number.isFinite(ref) || ref <= 0) return "일당맵 회원";

  try {
    const store = useContactsStore.getState();
    const contacts = buildContactsList(store.favoriteById, store.memoById, store.addedContacts);
    const match = contacts.find((c) => contactStableUserId(c) === ref);
    if (match?.name) return String(match.name).trim();
  } catch (_) {
    /* store 미초기화 */
  }

  return "일당맵 회원";
}

export function readPendingInvite() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PENDING_INVITE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export function clearPendingInvite() {
  try {
    localStorage.removeItem(PENDING_INVITE_KEY);
  } catch (_) {
    /* noop */
  }
}
