/**
 * 초대 링크 적용 — 가입·로그인 직후 pending invite를 프로필·연락처에 반영.
 */
import { useContactsStore, buildContactsList } from "../store/useContactsStore";
import { useUserStore } from "../store/useUserStore";
import { contactStableUserId } from "./fieldContactsMock";
import { clearPendingInvite, readPendingInvite } from "./pendingInvite";

export function readAppliedReferrer() {
  const profile = useUserStore.getState().profile;
  const refId = Number(profile?.referredByUserId);
  if (!Number.isFinite(refId) || refId <= 0) return null;
  return {
    referredByUserId: refId,
    referredByContactId: profile?.referredByContactId || null,
    referredByGroupId: profile?.referredByGroupId || null,
    inviteAppliedAt: profile?.inviteAppliedAt || null,
  };
}

/**
 * 인증된 사용자에 대해 pending invite 1회 적용.
 * @returns {object|null} 적용 결과
 */
export function applyPendingInvite() {
  const pending = readPendingInvite();
  if (!pending) return null;

  const state = useUserStore.getState();
  if (!state.session?.isAuthenticated) return null;

  const joinedUserId = Number(state.profile?.applicantUserId || state.session?.user?.id);
  if (!Number.isFinite(joinedUserId) || joinedUserId <= 0) return null;

  if (state.profile?.referredByUserId) {
    clearPendingInvite();
    return { alreadyApplied: true, referredByUserId: state.profile.referredByUserId };
  }

  const refUserId = pending.ref ? Number(pending.ref) : null;
  const hasRef = Number.isFinite(refUserId) && refUserId > 0;

  if (hasRef && refUserId === joinedUserId) {
    clearPendingInvite();
    return null;
  }

  const joinedName = String(state.profile?.displayNickname || state.session?.user?.nickname || "").trim();

  const contactsStore = useContactsStore.getState();
  const linkedContactId = contactsStore.linkInvitedContact({
    contactId: pending.contactId,
    groupId: pending.groupId,
    joinedUserId,
    joinedName,
    joinedResidence: state.profile?.residence || "",
  });

  if (hasRef) {
    const contacts = buildContactsList(
      contactsStore.favoriteById,
      contactsStore.memoById,
      contactsStore.addedContacts
    );
    const inviterExists = contacts.some((c) => contactStableUserId(c) === refUserId);
    if (!inviterExists) {
      contactsStore.addContact({
        name: "일당맵 초대자",
        userId: refUserId,
        source: "appuser",
      });
    }
  }

  useUserStore.getState().setProfile({
    referredByUserId: hasRef ? refUserId : null,
    referredByContactId: pending.contactId || null,
    referredByGroupId: pending.groupId || null,
    inviteAppliedAt: new Date().toISOString(),
  });

  clearPendingInvite();

  return {
    referredByUserId: hasRef ? refUserId : null,
    linkedContactId,
    pending,
  };
}
