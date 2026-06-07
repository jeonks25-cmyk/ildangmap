import React, { useCallback, useMemo, useState } from "react";
import { buildContactsList, useContactsStore } from "../../store/useContactsStore";
import { useSettlementStore } from "../../store/useSettlementStore";
import { useUserStore } from "../../store/useUserStore";
import { useUserMapPreferences } from "../../context/UserMapPreferencesContext";
import { useChatStore } from "../../store/useChatStore";
import { useUiStore } from "../../store/useUiStore";
import { CONTACT_QUICK_MODE, quickActionToastMessage, quickContactSiteAction } from "../../utils/contactQuickAction";
import { buildFieldTeamRoster } from "../../utils/fieldTeamRosterModel";
import { CRAFT_LABEL } from "../../utils/jobModel";
import { buildPersonLines } from "../../utils/fieldProfileCard";
import { contactStableUserId } from "../../utils/fieldContactsMock";
import { usePersonCard } from "../../context/PersonCardContext";

function RosterCard({ row, job, onPhone, onKakao, onInvite }) {
  const { contact, availability, roleLabel, distanceLabel, recentWorkLabel } = row;
  const { openPersonCard } = usePersonCard();
  const craftLabel = CRAFT_LABEL[contact.trade] || contact.tradeLabel || "";
  const identityLine = buildPersonLines(contact, "invite").lines.join(" · ");

  return (
    <article className={`field-team-roster__card field-team-roster__card--${availability.tone}`}>
      <div className="field-team-roster__card-main">
        <span className="field-team-roster__avatar" aria-hidden="true">
          {contact.name.slice(0, 1)}
        </span>
        <div className="field-team-roster__card-body">
          <div className="field-team-roster__card-top">
            <button type="button" className="field-team-roster__name-btn" onClick={() => openPersonCard(contact)}>
              {contact.name}
            </button>
            <span className={`field-team-roster__avail field-team-roster__avail--${availability.tone}`}>
              {availability.cardLine}
            </span>
          </div>
          {identityLine ? <p className="field-team-roster__identity">{identityLine}</p> : null}
          <p className="field-team-roster__meta">
            {roleLabel}
            {craftLabel ? ` · ${craftLabel}` : ""} · {recentWorkLabel} · {distanceLabel}
          </p>
        </div>
      </div>
      <div className="field-team-roster__actions" role="group" aria-label={`${contact.name} 연락`}>
        <button type="button" onClick={() => onPhone(contact)} disabled={!contact.phone}>
          전화
        </button>
        <button type="button" onClick={() => onKakao(contact)}>
          카톡
        </button>
        <button type="button" className="field-team-roster__actions-primary" onClick={() => onInvite(contact)}>
          초대
        </button>
      </div>
    </article>
  );
}

function RosterSection({ title, lead, rows, job, onPhone, onKakao, onInvite, headerAction }) {
  if (!rows?.length) return null;
  return (
    <section className="field-team-roster__section">
      <div className="field-team-roster__section-head">
        <h3>{title}</h3>
        {headerAction || null}
      </div>
      {lead ? <p className="field-team-roster__lead">{lead}</p> : null}
      <div className="field-team-roster__list">
        {rows.map((row) => (
          <RosterCard key={row.contact.id} row={row} job={job} onPhone={onPhone} onKakao={onKakao} onInvite={onInvite} />
        ))}
      </div>
    </section>
  );
}

export default function FieldTeamRosterSheet({ open, job, scheduleId = null, workDateStart, workDateEnd, onClose }) {
  const { prefs } = useUserMapPreferences();
  const schedules = useSettlementStore((s) => s.schedules);
  const inviteContactsToSchedule = useSettlementStore((s) => s.inviteContactsToSchedule);
  const favoriteById = useContactsStore((s) => s.favoriteById);
  const memoById = useContactsStore((s) => s.memoById);
  const showAppToast = useUiStore((s) => s.showAppToast);
  const openRoomForContact = useChatStore((s) => s.openRoomForContact);
  const myUserId = useUserStore((s) => s.session?.userId ?? s.profile?.userId ?? 1);
  const myName = useUserStore((s) => s.profile?.name || s.profile?.nickname || "현장 소장");
  const [inviteCountById, setInviteCountById] = useState({});

  const recordStructuredInvites = useCallback(
    (contacts) => {
      if (!scheduleId) return;
      const invitees = (Array.isArray(contacts) ? contacts : [])
        .filter(Boolean)
        .map((c) => ({
          userId: contactStableUserId(c),
          name: c.name,
          birthYear: Number.isFinite(Number(c.birthYear)) ? Number(c.birthYear) : null,
          residence: String(c.homeRegion || c.region || "").trim(),
        }));
      if (!invitees.length) return;
      inviteContactsToSchedule({ scheduleId, fromUserId: myUserId, fromName: myName, invitees });
    },
    [inviteContactsToSchedule, myName, myUserId, scheduleId]
  );

  const contacts = useMemo(
    () => buildContactsList(favoriteById, memoById),
    [favoriteById, memoById]
  );

  const roster = useMemo(
    () =>
      buildFieldTeamRoster({
        contacts,
        workDateStart: workDateStart || job?.workDate,
        workDateEnd: workDateEnd || job?.workDateEnd || job?.workDate,
        schedules,
        regionLabel: prefs?.regionLabel,
        inviteCountById,
      }),
    [contacts, inviteCountById, job, prefs?.regionLabel, schedules, workDateEnd, workDateStart]
  );

  const handlePhone = useCallback(
    (contact) => {
      const phone = String(contact?.phone || "").replace(/[^\d+]/g, "");
      if (!phone) {
        showAppToast("전화번호가 없습니다");
        return;
      }
      window.location.href = `tel:${phone}`;
    },
    [showAppToast]
  );

  const handleKakao = useCallback(
    (contact) => {
      const room = openRoomForContact(contact);
      if (room?.id) showAppToast(`${contact.name}님과 대화를 열었습니다`);
      else showAppToast("카톡 연결은 준비 중입니다");
    },
    [openRoomForContact, showAppToast]
  );

  const handleInvite = useCallback(
    (contact) => {
      if (!job) return;
      const sent = quickContactSiteAction(contact, job, CONTACT_QUICK_MODE.INVITE);
      if (sent) {
        setInviteCountById((prev) => ({ ...prev, [contact.id]: (prev[contact.id] || 0) + 1 }));
        recordStructuredInvites([contact]);
        showAppToast(quickActionToastMessage(contact, CONTACT_QUICK_MODE.INVITE));
      }
    },
    [job, recordStructuredInvites, showAppToast]
  );

  const handleInviteAll = useCallback(() => {
    if (!job) return;
    const rows = roster.availableNow || [];
    if (!rows.length) {
      showAppToast("초대할 비는 사람이 없습니다");
      return;
    }
    let sent = 0;
    const next = {};
    const invitedContacts = [];
    rows.forEach((row) => {
      const contact = row.contact;
      if (!contact) return;
      if (quickContactSiteAction(contact, job, CONTACT_QUICK_MODE.INVITE)) {
        sent += 1;
        next[contact.id] = 1;
        invitedContacts.push(contact);
      }
    });
    if (sent) {
      setInviteCountById((prev) => {
        const merged = { ...prev };
        Object.keys(next).forEach((id) => {
          merged[id] = (merged[id] || 0) + 1;
        });
        return merged;
      });
      recordStructuredInvites(invitedContacts);
      showAppToast(`비는 사람 ${sent}명에게 초대를 보냈습니다`);
    } else {
      showAppToast("초대를 보내지 못했습니다");
    }
  }, [job, recordStructuredInvites, roster.availableNow, showAppToast]);

  if (!open || !job) return null;

  const siteTitle = job.title || "새 현장";

  return (
    <div className="field-team-roster-sheet" role="presentation" onClick={onClose}>
      <section
        className="field-team-roster-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-label="팀원 부르기"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="field-team-roster-sheet__head">
          <div>
            <p className="field-team-roster-sheet__eyebrow">현장 일정 저장 완료</p>
            <h2>{siteTitle}</h2>
            <p className="field-team-roster-sheet__sub">
              {roster.dateRangeLabel} · 지도·일정 반영됨 · 이제 사람만 배치하면 됩니다
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기">
            닫기
          </button>
        </header>

        <div className="field-team-roster-sheet__content">
          <RosterSection
            title={`${roster.dateRangeLabel} 비는 사람`}
            lead="일정이 비어 있는 사람부터 보여드립니다. 바로 전화·카톡·초대하세요."
            rows={roster.availableNow}
            job={job}
            onPhone={handlePhone}
            onKakao={handleKakao}
            onInvite={handleInvite}
            headerAction={
              <button
                type="button"
                className="field-team-roster__invite-all"
                onClick={handleInviteAll}
              >
                전체 초대
              </button>
            }
          />
          <RosterSection
            title="즐겨찾기"
            rows={roster.favorites.filter((r) => !roster.availableNow.some((a) => a.contact.id === r.contact.id))}
            job={job}
            onPhone={handlePhone}
            onKakao={handleKakao}
            onInvite={handleInvite}
          />
          <RosterSection
            title="최근 같이 일한 사람"
            rows={roster.recent.filter((r) => !roster.availableNow.some((a) => a.contact.id === r.contact.id))}
            job={job}
            onPhone={handlePhone}
            onKakao={handleKakao}
            onInvite={handleInvite}
          />
          <RosterSection
            title="자주 부른 사람"
            rows={roster.frequent.filter((r) => !roster.availableNow.some((a) => a.contact.id === r.contact.id))}
            job={job}
            onPhone={handlePhone}
            onKakao={handleKakao}
            onInvite={handleInvite}
          />
          <RosterSection
            title="연락처"
            rows={roster.saved.filter((r) => !roster.availableNow.some((a) => a.contact.id === r.contact.id))}
            job={job}
            onPhone={handlePhone}
            onKakao={handleKakao}
            onInvite={handleInvite}
          />
        </div>
      </section>
    </div>
  );
}
