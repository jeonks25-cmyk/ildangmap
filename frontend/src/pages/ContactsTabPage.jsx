import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ContactCard from "../components/contacts/ContactCard";
import ContactGroupAddSheet from "../components/contacts/ContactGroupAddSheet";
import GroupScheduleBoardSheet from "../components/contacts/GroupScheduleBoardSheet";
import PeopleAddSheet from "../components/contacts/PeopleAddSheet";
import { buildContactsList, useContactsStore } from "../store/useContactsStore";
import { useUserMapPreferences } from "../context/UserMapPreferencesContext";
import { usePersonCard } from "../context/PersonCardContext";
import { getContactSearchBlob } from "../utils/fieldContactsMock";
import { enrichContactTeam } from "../utils/teamNetworkModel";
import {
  formatGroupTradeLabel,
  GROUP_TRADE_HINT_OPTIONS,
  isGroupTradeInferred,
  resolveGroupCraft,
} from "../utils/groupTradeHint";
import { useTeamAvailabilityOutlook } from "../hooks/useOwnerAvailabilityOutlook";
import { guardMemberAction } from "../hooks/useRequireAuth";
import AppTabHeader from "../components/layout/AppTabHeader";
import MapNotificationOverlay from "../components/map/MapNotificationOverlay";
import FloatingActionButton from "../components/ui/FloatingActionButton";
import { useTabNotificationOverlay } from "../hooks/useTabNotificationOverlay";
import "../styles/contacts-tab-mobile.css";

const GROUP_PREFIX = "g:";

export default function ContactsTabPage() {
  const overlay = useTabNotificationOverlay();
  const location = useLocation();
  const navigate = useNavigate();
  const { prefs } = useUserMapPreferences();
  const favoriteById = useContactsStore((s) => s.favoriteById);
  const memoById = useContactsStore((s) => s.memoById);
  const addedContacts = useContactsStore((s) => s.addedContacts);
  const toggleFavorite = useContactsStore((s) => s.toggleFavorite);
  const groups = useContactsStore((s) => s.groups);
  const memberIdsByGroup = useContactsStore((s) => s.memberIdsByGroup);
  const createGroup = useContactsStore((s) => s.createGroup);
  const renameGroup = useContactsStore((s) => s.renameGroup);
  const setGroupTradeHint = useContactsStore((s) => s.setGroupTradeHint);
  const deleteGroup = useContactsStore((s) => s.deleteGroup);
  const addToGroup = useContactsStore((s) => s.addToGroup);
  const removeFromGroup = useContactsStore((s) => s.removeFromGroup);
  const { openPersonCard } = usePersonCard();

  const contacts = useMemo(
    () =>
      buildContactsList(favoriteById, memoById, addedContacts).map((c) =>
        enrichContactTeam(c, prefs?.regionLabel)
      ),
    [favoriteById, memoById, addedContacts, prefs?.regionLabel]
  );

  const [query, setQuery] = useState("");
  const [listFilter, setListFilter] = useState("all");
  const [nameModal, setNameModal] = useState(null); // { mode: "create"|"rename", groupId?, value }
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [peopleAddOpen, setPeopleAddOpen] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);

  const teamOutlook = useTeamAvailabilityOutlook(contacts);
  const outlookById = teamOutlook.byId;

  const activeGroupId = listFilter.startsWith(GROUP_PREFIX) ? listFilter.slice(GROUP_PREFIX.length) : null;
  const activeGroup = useMemo(
    () => (activeGroupId ? groups.find((g) => g.id === activeGroupId) || null : null),
    [activeGroupId, groups]
  );
  const activeMemberIds = activeGroupId ? memberIdsByGroup[activeGroupId] || [] : [];
  const activeGroupMembers = useMemo(() => {
    if (!activeGroupId) return [];
    const memberSet = new Set((memberIdsByGroup[activeGroupId] || []).map(String));
    return contacts.filter((c) => memberSet.has(String(c.id)));
  }, [activeGroupId, memberIdsByGroup, contacts]);

  // 활성 그룹이 사라지면(삭제) 전체 탭으로 복귀
  useEffect(() => {
    if (activeGroupId && !activeGroup) setListFilter("all");
  }, [activeGroupId, activeGroup]);

  const tabs = useMemo(() => {
    const groupTabs = groups.map((g) => ({
      key: `${GROUP_PREFIX}${g.id}`,
      label: g.name,
      count: (memberIdsByGroup[g.id] || []).length,
    }));
    return [
      { key: "all", label: "전체", count: contacts.length },
      ...groupTabs,
      { key: "favorites", label: "즐겨찾기", count: contacts.filter((c) => c.favorite).length },
    ];
  }, [groups, memberIdsByGroup, contacts]);

  useEffect(() => {
    const focusId = location.state?.focusContactId;
    if (!focusId) return;
    const found = contacts.find((c) => String(c.id) === String(focusId));
    if (found) openPersonCard(found);
  }, [location.state?.focusContactId, contacts, openPersonCard]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const memberSet = activeGroupId ? new Set((memberIdsByGroup[activeGroupId] || []).map(String)) : null;
    return contacts.filter((c) => {
      if (listFilter === "favorites" && !c.favorite) return false;
      if (memberSet && !memberSet.has(String(c.id))) return false;
      if (!q) return true;
      return getContactSearchBlob(c).includes(q);
    });
  }, [contacts, listFilter, query, activeGroupId, memberIdsByGroup]);

  const summary = useMemo(() => {
    let available = 0;
    let busy = 0;
    let none = 0;
    filtered.forEach((c) => {
      const st = outlookById[c.id]?.state;
      if (st === "available") available += 1;
      else if (st === "busy") busy += 1;
      else none += 1;
    });
    return { total: filtered.length, available, busy, none };
  }, [filtered, outlookById]);

  const handleToggleFavoriteById = useCallback((id) => toggleFavorite(id), [toggleFavorite]);

  // 그룹 일정 보드 → 일정 탭의 현장 작성 시트로 연결(날짜·필요 인원 추천값 전달).
  const handleCreateFieldFromBoard = useCallback(
    ({ dateKey, availableCount, group: sourceGroup }) => {
      setBoardOpen(false);
      const defaultCraft = resolveGroupCraft(sourceGroup);
      navigate("/schedule", {
        state: {
          composeField: {
            dateKey,
            crewCount: availableCount,
            defaultCraft: defaultCraft || null,
            groupName: sourceGroup?.name || "",
          },
        },
      });
    },
    [navigate]
  );

  const submitName = useCallback(() => {
    if (!nameModal) return;
    const value = String(nameModal.value || "").trim();
    if (!value) return;
    if (nameModal.mode === "create") {
      if (!guardMemberAction("post")) return;
      const id = createGroup(value);
      if (id) setListFilter(`${GROUP_PREFIX}${id}`);
    } else if (nameModal.mode === "rename" && nameModal.groupId) {
      renameGroup(nameModal.groupId, value);
    }
    setNameModal(null);
  }, [nameModal, createGroup, renameGroup]);

  const handleDeleteGroup = useCallback(() => {
    if (!activeGroup) return;
    const ok = window.confirm(`'${activeGroup.name}' 그룹을 삭제할까요?\n연락처 자체는 지워지지 않습니다.`);
    if (!ok) return;
    deleteGroup(activeGroup.id);
    setListFilter("all");
  }, [activeGroup, deleteGroup]);

  const emptyMessage = useMemo(() => {
    if (query.trim()) return "검색 결과가 없습니다.";
    if (listFilter === "favorites") return "즐겨찾기한 사람이 없습니다.";
    return "함께 부를 사람이 아직 없습니다.";
  }, [listFilter, query]);

  const showGroupEmpty = activeGroup && activeMemberIds.length === 0 && !query.trim();
  const activeGroupTradeLabel = activeGroup ? formatGroupTradeLabel(activeGroup) : null;
  const activeGroupTradeInferred = activeGroup ? isGroupTradeInferred(activeGroup) : false;

  return (
    <div
      ref={overlay.pageRef}
      className={`contacts-tab-page contacts-tab-page--board tab-page-shell${overlay.notificationOverlayOpen ? " contacts-tab-page--overlay-open" : ""}`}
    >
      <AppTabHeader
        title="인원"
        onOpenNotifications={overlay.handleOpenNotificationCenter}
        unreadCount={overlay.unreadCount}
      />
      <div className="tab-page-shell__body contacts-tab-page__body">
      <div className="contacts-desktop-split">
      <div className="contacts-desktop-list">

      <section className="team-summary-bar" aria-label="우리 팀 현황">
        <div className="team-summary-bar__head">
          <strong className="team-summary-bar__total">
            {activeGroup ? activeGroup.name : "우리팀"} {summary.total}명
          </strong>
          {activeGroupTradeLabel ? (
            <span
              className={`team-summary-bar__trade${activeGroupTradeInferred ? " team-summary-bar__trade--inferred" : ""}`}
            >
              {activeGroupTradeLabel}
            </span>
          ) : null}
        </div>
        <div className="team-summary-bar__stats">
          <span className="team-summary-bar__stat team-summary-bar__stat--available">🟢 가능 {summary.available}</span>
          <span className="team-summary-bar__stat team-summary-bar__stat--busy">🟡 일정 있음 {summary.busy}</span>
          <span className="team-summary-bar__stat team-summary-bar__stat--none">⚫ 미공유 {summary.none}</span>
        </div>
      </section>

      <label className="contacts-search">
        <span className="contacts-search__icon" aria-hidden="true">
          🔍
        </span>
        <input
          type="search"
          className="contacts-search__input"
          placeholder="이름 · 지역"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="팀원 검색"
        />
      </label>

      <div className="contacts-tab-page__filters" role="tablist" aria-label="팀 그룹">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            role="tab"
            className={`contacts-chip${listFilter === key ? " contacts-chip--active" : ""}`}
            onClick={() => setListFilter(key)}
            aria-selected={listFilter === key}
          >
            {label} {count}
          </button>
        ))}
        <button
          type="button"
          className="contacts-chip contacts-chip--add"
          onClick={() => {
            if (!guardMemberAction("post")) return;
            setNameModal({ mode: "create", value: "" });
          }}
          aria-label="새 그룹 만들기"
        >
          + 그룹
        </button>
      </div>

      {activeGroup ? (
        <>
          <div className="contacts-group-trade-hint" role="group" aria-label="공정 힌트 (선택)">
            <span className="contacts-group-trade-hint__label">공정 힌트</span>
            <div className="contacts-group-trade-hint__chips">
              <button
                type="button"
                className={`contacts-group-trade-hint__chip${!activeGroup.tradeHint ? " is-active" : ""}`}
                onClick={() => setGroupTradeHint(activeGroup.id, null)}
              >
                없음
              </button>
              {GROUP_TRADE_HINT_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`contacts-group-trade-hint__chip${activeGroup.tradeHint === value ? " is-active" : ""}`}
                  onClick={() => setGroupTradeHint(activeGroup.id, value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="contacts-group-actions" role="group" aria-label="그룹 관리">
          <button
            type="button"
            className="contacts-group-actions__btn contacts-group-actions__btn--primary"
            onClick={() => setBoardOpen(true)}
            disabled={activeMemberIds.length === 0}
          >
            📅 일정 보기
          </button>
          <button
            type="button"
            className="contacts-group-actions__btn"
            onClick={() => setAddSheetOpen(true)}
          >
            ＋ 사람 추가
          </button>
          <button
            type="button"
            className="contacts-group-actions__btn"
            onClick={() => setNameModal({ mode: "rename", groupId: activeGroup.id, value: activeGroup.name })}
          >
            이름 변경
          </button>
          <button
            type="button"
            className="contacts-group-actions__btn contacts-group-actions__btn--danger"
            onClick={handleDeleteGroup}
          >
            삭제
          </button>
        </div>
        </>
      ) : null}

      <div className="contacts-tab-page__list" role="list">
        {showGroupEmpty ? (
          <div className="contacts-group-empty">
            <p className="contacts-group-empty__text">아직 그룹에 사람이 없습니다</p>
            <button
              type="button"
              className="contacts-group-empty__cta"
              onClick={() => setAddSheetOpen(true)}
            >
              사람 추가하기
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="contacts-tab-page__empty">{emptyMessage}</p>
        ) : (
          filtered.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              outlook={outlookById[contact.id]}
              onToggleFavoriteById={handleToggleFavoriteById}
            />
          ))
        )}
      </div>

      </div>

      <aside className="contacts-desktop-detail-pane" aria-label="인원 상세">
        <p className="contacts-desktop-detail-pane__hint">목록에서 인원을 선택하세요</p>
      </aside>
      </div>
      </div>

      {nameModal ? (
        <div className="group-name-modal" role="presentation" onClick={() => setNameModal(null)}>
          <div
            className="group-name-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label={nameModal.mode === "create" ? "새 그룹 만들기" : "그룹 이름 변경"}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="group-name-modal__title">
              {nameModal.mode === "create" ? "새 그룹 만들기" : "그룹 이름 변경"}
            </h2>
            <input
              type="text"
              className="group-name-modal__input"
              value={nameModal.value}
              placeholder="예: 내 필름팀, 급할 때 부르는 사람"
              autoFocus
              maxLength={20}
              onChange={(e) => setNameModal((prev) => ({ ...prev, value: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitName();
              }}
            />
            <div className="group-name-modal__actions">
              <button type="button" className="group-name-modal__cancel" onClick={() => setNameModal(null)}>
                취소
              </button>
              <button
                type="button"
                className="group-name-modal__ok"
                onClick={submitName}
                disabled={!String(nameModal.value || "").trim()}
              >
                {nameModal.mode === "create" ? "만들기" : "저장"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ContactGroupAddSheet
        open={addSheetOpen && Boolean(activeGroup)}
        group={activeGroup}
        contacts={contacts}
        memberIds={activeMemberIds}
        onAdd={(cid) => activeGroup && addToGroup(activeGroup.id, cid)}
        onRemove={(cid) => activeGroup && removeFromGroup(activeGroup.id, cid)}
        onClose={() => setAddSheetOpen(false)}
      />

      <PeopleAddSheet
        open={peopleAddOpen}
        onClose={() => setPeopleAddOpen(false)}
        onAdded={() => setListFilter("all")}
      />

      <GroupScheduleBoardSheet
        open={boardOpen && Boolean(activeGroup)}
        group={activeGroup}
        members={activeGroupMembers}
        onClose={() => setBoardOpen(false)}
        onCreateField={handleCreateFieldFromBoard}
      />

      <FloatingActionButton label="인원" aria-label="인원 추가" onClick={() => setPeopleAddOpen(true)} />
      <MapNotificationOverlay
        open={overlay.notificationOverlayOpen}
        mode={overlay.notificationOverlayMode}
        detailNotification={overlay.notificationOverlayDetail}
        notifications={overlay.notificationItems}
        mapContainerRef={overlay.pageRef}
        onClose={overlay.handleCloseNotificationOverlay}
        onBack={overlay.handleNotificationOverlayBack}
        onSelectNotification={overlay.handleNotificationOverlaySelect}
      />
    </div>
  );
}
