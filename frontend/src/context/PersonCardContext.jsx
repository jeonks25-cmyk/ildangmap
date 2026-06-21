import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildContactsList, useContactsStore } from "../store/useContactsStore";
import { contactStableUserId, getContactDisplayName, isUnregisteredContact } from "../utils/fieldContactsMock";
import { resolveScheduleOwnerId } from "../store/useFieldScheduleStore";
import { useChatStore } from "../store/useChatStore";
import { useUiStore } from "../store/useUiStore";
import { useUserStore } from "../store/useUserStore";
import { loadStoredJobs } from "../utils/jobsStorage";
import { getDisplayNickname } from "../utils/displayNickname";
import { buildInviteSharePayload, buildSmsHref } from "../utils/inviteLink";
import { formatRegionsLabel, getPrimaryRegion, normalizeActivityRegions } from "../constants/activityRegions";
import {
  CONTACT_QUICK_MODE,
  quickActionToastMessage,
  quickContactSiteAction,
} from "../utils/contactQuickAction";
import FieldBusinessCardSheet from "../components/profile/FieldBusinessCardSheet";
import ContactEditSheet from "../components/contacts/ContactEditSheet";
import ContactSiteShareSheet from "../components/contacts/ContactSiteShareSheet";
import ConfirmDialog from "../components/common/ConfirmDialog";
import {
  deriveCoworkStats,
  listCoworkHistoryForContact,
  listRecentCoworkSites,
} from "../utils/coworkHistoryModel";

const PersonCardContext = createContext({ openPersonCard: () => {} });

export function usePersonCard() {
  return useContext(PersonCardContext);
}

function firstValue(...vals) {
  for (const v of vals) {
    if (v != null && String(v).trim() !== "") return v;
  }
  return undefined;
}

/**
 * 다양한 출처(연락처/참여자/게시판 작성자/채팅 룸)를 명함용 인물로 정규화하고
 * userId·contactId·이름으로 연락처를 찾아 부족한 정보를 보강한다.
 * 신규 데이터 모델 없음 — 기존 연락처 + fieldProfileCard 포매터 재사용.
 */
function resolvePerson(src, contacts, coworkHistory = []) {
  const rawName = firstValue(src.realName, src.name, src.authorName, src.ownerName);
  const rawBirth = firstValue(src.birthYear, src.authorBirthYear, src.ownerBirthYear);
  const rawResidence = firstValue(src.residence, src.homeRegion, src.region, src.ownerResidence);
  const rawUserId = firstValue(src.userId, src.authorUserId);
  const rawContactId = firstValue(src.contactId, src.id);

  let match = null;
  if (rawContactId != null) match = contacts.find((c) => String(c.id) === String(rawContactId));
  if (!match && rawUserId != null) {
    const uid = Number(rawUserId);
    if (Number.isFinite(uid)) match = contacts.find((c) => contactStableUserId(c) === uid);
  }
  if (!match && rawName) match = contacts.find((c) => c.name === String(rawName).trim());

  const base = match || {};
  const person = {
    id: firstValue(match?.id, rawContactId, rawUserId),
    name: firstValue(rawName, base.name) || "이름 미입력",
    displayName: getContactDisplayName(match || { name: rawName, nickname: src.nickname }),
    birthYear: firstValue(rawBirth, base.birthYear) ?? null,
    residence: firstValue(rawResidence, base.homeRegion) || "",
    craft: firstValue(src.craft, base.trade) || "",
    craftLabel: firstValue(src.craftLabel, base.tradeLabel),
    role: firstValue(src.role, "") || "",
    careerYears: firstValue(src.careerYears, src.experienceYears, base.experienceYears) ?? null,
    basePay: firstValue(src.basePay, base.basePay) ?? null,
    photo: firstValue(src.photo, src.profileImage, src.authorImageUrl, base.profileImage) || "",
    memo: String(match?.memo || src.memo || "").trim(),
  };

  let coworkCount = null;
  let lastWorkedAt = null;
  let recentSites = [];
  let coworkHistoryEntries = [];
  if (match) {
    const stats = deriveCoworkStats(match.id, coworkHistory);
    if (stats.count > 0) coworkCount = stats.count;
    if (stats.lastWorkedAt) lastWorkedAt = stats.lastWorkedAt;
    recentSites = listRecentCoworkSites(match.id, coworkHistory, 5);
    coworkHistoryEntries = listCoworkHistoryForContact(match.id, coworkHistory);
  }
  const ownerId = resolveScheduleOwnerId(match || person);
  const contactUserId = match ? contactStableUserId(match) : null;
  return { person, coworkCount, lastWorkedAt, recentSites, coworkHistoryEntries, contact: match || null, ownerId, contactUserId };
}

export function PersonCardProvider({ children }) {
  const navigate = useNavigate();
  const favoriteById = useContactsStore((s) => s.favoriteById);
  const memoById = useContactsStore((s) => s.memoById);
  const addedContacts = useContactsStore((s) => s.addedContacts);
  const contactOverridesById = useContactsStore((s) => s.contactOverridesById);
  const removedContactIds = useContactsStore((s) => s.removedContactIds);
  const coworkHistory = useContactsStore((s) => s.coworkHistory);
  const myUserId = useUserStore((s) => s.session?.userId ?? s.profile?.userId ?? 1);
  const myProfileId = useUserStore((s) => String(s.profile?.id || s.session?.user?.id || ""));
  const profile = useUserStore((s) => s.profile);
  const sessionUser = useUserStore((s) => s.session?.user);
  const myDisplayName = useMemo(() => getDisplayNickname(profile, sessionUser), [profile, sessionUser]);
  const updateContactFields = useContactsStore((s) => s.updateContactFields);
  const saveLocalProfileDetails = useUserStore((s) => s.saveLocalProfileDetails);
  const setProfileMeta = useUserStore((s) => s.setProfileMeta);
  const setMemo = useContactsStore((s) => s.setMemo);
  const deleteContact = useContactsStore((s) => s.deleteContact);
  const [card, setCard] = useState(null);
  const [inviteContact, setInviteContact] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const shareableJobs = useMemo(() => loadStoredJobs().filter(Boolean), []);

  const openPersonCard = useCallback(
    (src) => {
      if (!src) return;
      const contacts = buildContactsList(
        favoriteById,
        memoById,
        addedContacts,
        contactOverridesById,
        removedContactIds
      );
      setCard(resolvePerson(src, contacts, coworkHistory));
    },
    [favoriteById, memoById, addedContacts, contactOverridesById, removedContactIds, coworkHistory]
  );

  const handleCall = useCallback(() => {
    const phone = String(card?.contact?.phone || "").replace(/[^\d+]/g, "");
    if (!phone) {
      useUiStore.getState().showAppToast("등록된 번호가 없습니다");
      return;
    }
    window.location.href = `tel:${phone}`;
  }, [card]);

  const handleKakao = useCallback(() => {
    const contact = card?.contact;
    if (!contact) {
      useUiStore.getState().showAppToast("연락처 정보가 없습니다");
      return;
    }
    const room = useChatStore.getState().openRoomForContact(contact);
    setCard(null);
    navigate(`/chat/${room?.id || `direct-${contact.id}`}`);
  }, [card, navigate]);

  const handleInvite = useCallback(() => {
    const contact = card?.contact;
    if (!contact) {
      useUiStore.getState().showAppToast("연락처 정보가 없습니다");
      return;
    }
    setInviteContact(contact);
  }, [card]);

  const handleSendInvite = useCallback(
    (contact, job) => {
      const room = quickContactSiteAction(contact, job, CONTACT_QUICK_MODE.INVITE);
      useUiStore.getState().showAppToast(quickActionToastMessage(contact, CONTACT_QUICK_MODE.INVITE));
      setInviteContact(null);
      setCard(null);
      if (room?.id) navigate(`/chat/${room.id}`);
    },
    [navigate]
  );

  const buildInvitePayloadForContact = useCallback(
    (contact) => {
      return buildInviteSharePayload({
        ref: myUserId,
        contactId: contact?.id,
        inviterName: myDisplayName,
      });
    },
    [myDisplayName, myUserId]
  );

  // 미가입자 초대 — 문자(sms:) / 공유(navigator.share) / 링크 복사 (동일 URL·문구)
  const handleSmsInvite = useCallback(() => {
    const contact = card?.contact;
    const { fullText } = buildInvitePayloadForContact(contact);
    window.location.href = buildSmsHref({ phone: contact?.phone, body: fullText });
    useUiStore.getState().showAppToast("문자 초대를 준비했습니다");
  }, [buildInvitePayloadForContact, card]);

  const handleCopyInvite = useCallback(async () => {
    const { fullText } = buildInvitePayloadForContact(card?.contact);
    try {
      await navigator.clipboard.writeText(fullText);
      useUiStore.getState().showAppToast("초대 메시지를 복사했습니다");
    } catch (_) {
      useUiStore.getState().showAppToast(fullText);
    }
  }, [buildInvitePayloadForContact, card]);

  const handleKakaoInvite = useCallback(async () => {
    const { title, text, url } = buildInvitePayloadForContact(card?.contact);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (_) {
        return;
      }
    }
    await handleCopyInvite();
  }, [buildInvitePayloadForContact, card, handleCopyInvite]);

  const editContact = useMemo(() => {
    if (!card) return null;
    if (card.contact) return card.contact;
    const pid = card.person?.id;
    if (pid == null) return null;
    const contacts = buildContactsList(
      favoriteById,
      memoById,
      addedContacts,
      contactOverridesById,
      removedContactIds
    );
    return contacts.find((c) => String(c.id) === String(pid)) || null;
  }, [card, favoriteById, memoById, addedContacts, contactOverridesById, removedContactIds]);

  const handleEdit = useCallback(() => {
    if (!editContact?.id) {
      useUiStore.getState().showAppToast("수정할 연락처가 없습니다");
      return;
    }
    setEditOpen(true);
  }, [editContact]);

  const handleSaveEdit = useCallback(
    (patch) => {
      const contact = editContact || card?.contact;
      if (!contact?.id) return;
      updateContactFields(contact.id, patch);
      setMemo(contact.id, patch.memo);

      const contactUserId = contactStableUserId(contact);
      const myId = String(myProfileId || "").trim();
      const isSelf =
        (myId &&
          ((contactUserId != null && String(contactUserId) === myId) ||
            (contact.userId != null && String(contact.userId) === myId) ||
            (contact.applicantUserId != null && String(contact.applicantUserId) === myId))) ||
        false;

      if (isSelf) {
        const regions = normalizeActivityRegions(patch.homeRegions ?? patch.homeRegion ?? patch.region);
        saveLocalProfileDetails({
          regions,
          region: getPrimaryRegion(regions),
          residence: formatRegionsLabel(regions, { emptyLabel: "" }),
          craft: patch.trade,
          experienceYears: patch.experienceYears,
          desiredPay: patch.basePay,
          phone: patch.phone,
        });
        setProfileMeta({
          regions,
          region: getPrimaryRegion(regions),
          craft: patch.trade,
        });
      }

      setEditOpen(false);
      setCard(null);
      useUiStore.getState().showAppToast("인원 정보를 저장했습니다");
    },
    [editContact, card, updateContactFields, setMemo, myProfileId, saveLocalProfileDetails, setProfileMeta]
  );

  const handleDeleteContact = useCallback(() => {
    const contact = editContact || card?.contact;
    if (!contact?.id) return;
    deleteContact(contact.id);
    setEditOpen(false);
    setDeleteConfirmOpen(false);
    setCard(null);
    useUiStore.getState().showAppToast("목록에서 삭제했습니다");
  }, [editContact, card, deleteContact]);

  const handleRequestDelete = useCallback(() => {
    const contact = editContact || card?.contact;
    if (!contact?.id) {
      useUiStore.getState().showAppToast("삭제할 연락처가 없습니다");
      return;
    }
    setDeleteConfirmOpen(true);
  }, [editContact, card]);

  const isUnregistered = isUnregisteredContact(card?.contact);

  useEffect(() => {
    if (card?.person) {
      document.body.classList.add("person-card-open");
    } else {
      document.body.classList.remove("person-card-open");
    }
    return () => document.body.classList.remove("person-card-open");
  }, [card?.person]);

  const value = useMemo(() => ({ openPersonCard }), [openPersonCard]);

  return (
    <PersonCardContext.Provider value={value}>
      {children}
      <FieldBusinessCardSheet
        open={Boolean(card?.person)}
        person={card?.person}
        ownerId={card?.ownerId}
        viewerUserId={myUserId}
        contactUserId={card?.contactUserId}
        coworkCount={card?.coworkCount}
        lastWorkedAt={card?.lastWorkedAt}
        recentSites={card?.recentSites}
        coworkHistoryEntries={card?.coworkHistoryEntries}
        isUnregistered={isUnregistered}
        onClose={() => setCard(null)}
        onEdit={handleEdit}
        onDelete={handleRequestDelete}
        onCall={handleCall}
        onKakao={handleKakao}
        onInvite={handleInvite}
        onSmsInvite={handleSmsInvite}
        onKakaoInvite={handleKakaoInvite}
        onCopyInvite={handleCopyInvite}
      />
      <ContactEditSheet
        open={editOpen && Boolean(editContact)}
        contact={editContact}
        onClose={() => setEditOpen(false)}
        onSave={handleSaveEdit}
      />
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="인원 삭제"
        message={
          editContact || card?.contact
            ? `'${getContactDisplayName(editContact || card?.contact)}'님을 목록에서 삭제할까요?`
            : "목록에서 삭제할까요?"
        }
        confirmLabel="삭제"
        cancelLabel="취소"
        danger
        onConfirm={handleDeleteContact}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
      <ContactSiteShareSheet
        open={Boolean(inviteContact)}
        contact={inviteContact}
        jobs={shareableJobs}
        mode="invite"
        onClose={() => setInviteContact(null)}
        onShare={handleSendInvite}
      />
    </PersonCardContext.Provider>
  );
}
