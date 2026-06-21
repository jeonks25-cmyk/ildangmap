import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFieldScheduleStore } from "../../store/useFieldScheduleStore";
import { useContactsStore } from "../../store/useContactsStore";
import { useUiStore } from "../../store/useUiStore";
import { usePersonCard } from "../../context/PersonCardContext";
import { formatMonthDay, toDateKey } from "../../utils/fieldScheduleModel";
import { buildGroupDayDetail, buildGroupMonthBoard } from "../../utils/groupScheduleBoard";
import { formatGroupTradeLabel, isGroupTradeInferred, resolveGroupCraft } from "../../utils/groupTradeHint";
import { CONTACT_QUICK_MODE, quickContactSiteActionBatch } from "../../utils/contactQuickAction";

const WEEK_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * 그룹 일정 보드 — "날짜에 가능한 사람"을 찾는 화면.
 * 월간 캘린더에 날짜별 (가능/일정) 집계를 점으로 표시하고,
 * 날짜를 누르면 그 날 그룹 멤버를 상태별로 보여준다.
 * [전체 초대]는 선택 날짜의 가능 인원에게 기존 채팅 초대(quickContactSiteActionBatch)를 재사용한다.
 * 신규 데이터 모델 없음 — useFieldScheduleStore + 그룹 멤버십 재사용.
 */
export default function GroupScheduleBoardSheet({ open, group, members, onClose, onCreateField }) {
  const ensureSeeded = useFieldScheduleStore((s) => s.ensureSeeded);
  const seeded = useFieldScheduleStore((s) => s.seeded);
  const availabilityByOwner = useFieldScheduleStore((s) => s.availabilityByOwner);
  const personalEventsByOwner = useFieldScheduleStore((s) => s.personalEventsByOwner);
  const coworkHistory = useContactsStore((s) => s.coworkHistory);
  const showAppToast = useUiStore((s) => s.showAppToast);
  const { openPersonCard } = usePersonCard();

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedKey, setSelectedKey] = useState(() => toDateKey(now));

  useEffect(() => {
    ensureSeeded();
  }, [ensureSeeded, seeded]);

  useEffect(() => {
    if (open) {
      const d = new Date();
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setSelectedKey(toDateKey(d));
    }
  }, [open]);

  const memberList = useMemo(() => (Array.isArray(members) ? members : []), [members]);

  const board = useMemo(
    () =>
      buildGroupMonthBoard({
        members: memberList,
        availabilityByOwner,
        personalEventsByOwner,
        viewYear,
        viewMonth,
      }),
    [memberList, availabilityByOwner, personalEventsByOwner, viewYear, viewMonth]
  );

  const dayDetail = useMemo(
    () =>
      buildGroupDayDetail({
        members: memberList,
        availabilityByOwner,
        personalEventsByOwner,
        dateKey: selectedKey,
        coworkHistory,
      }),
    [memberList, availabilityByOwner, personalEventsByOwner, selectedKey, coworkHistory]
  );

  const goPrevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const goNextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const inviteTargets = dayDetail.available;

  const handleInviteAll = useCallback(() => {
    if (!inviteTargets.length) {
      showAppToast("이 날 가능한 사람이 없습니다");
      return;
    }
    const job = {
      title: `${group?.name || "우리팀"} 현장`,
      workDate: selectedKey,
      address: "",
    };
    const sent = quickContactSiteActionBatch(inviteTargets, job, CONTACT_QUICK_MODE.INVITE);
    if (!sent) {
      showAppToast("초대를 보내지 못했습니다");
      return;
    }
    showAppToast(`${formatMonthDay(selectedKey)} · ${sent}명에게 초대를 보냈습니다`);
  }, [inviteTargets, group, selectedKey, showAppToast]);

  const handleCreateField = useCallback(() => {
    onCreateField?.({
      dateKey: selectedKey,
      group,
      groupName: group?.name || "",
      availableCount: inviteTargets.length,
      defaultCraft: resolveGroupCraft(group),
    });
  }, [onCreateField, selectedKey, group, inviteTargets.length]);

  if (!open || !group) return null;

  const selectedAgg = board.byDateKey[selectedKey] || { available: 0, busy: 0, none: 0 };
  const tradeLabel = formatGroupTradeLabel(group);
  const tradeInferred = isGroupTradeInferred(group);

  return (
    <div className="group-board-sheet" role="presentation" onClick={onClose}>
      <section
        className="group-board-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-label={`${group.name} 일정 보드`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="group-board-sheet__head">
          <div className="group-board-sheet__title-row">
            <div className="group-board-sheet__title-block">
              <h2 className="group-board-sheet__title">{group.name} 일정</h2>
              {tradeLabel ? (
                <span
                  className={`group-board-sheet__trade${tradeInferred ? " group-board-sheet__trade--inferred" : ""}`}
                >
                  {tradeLabel}
                </span>
              ) : null}
            </div>
            <button type="button" className="group-board-sheet__close" onClick={onClose}>
              닫기
            </button>
          </div>
          <p className="group-board-sheet__sub">{memberList.length}명 · 날짜를 눌러 가능한 사람을 확인하세요</p>
        </header>

        <div className="group-board-cal">
          <div className="group-board-cal__nav">
            <button type="button" className="group-board-cal__nav-btn" onClick={goPrevMonth} aria-label="이전 달">
              ‹
            </button>
            <strong className="group-board-cal__month">
              {viewYear}년 {viewMonth + 1}월
            </strong>
            <button type="button" className="group-board-cal__nav-btn" onClick={goNextMonth} aria-label="다음 달">
              ›
            </button>
          </div>

          <div className="group-board-cal__week">
            {WEEK_LABELS.map((w) => (
              <span key={w} className="group-board-cal__week-cell">
                {w}
              </span>
            ))}
          </div>

          <div className="group-board-cal__grid">
            {board.rows.map((week, wi) =>
              week.map((d, di) => {
                if (!d) return <span key={`e-${wi}-${di}`} className="group-board-cal__cell group-board-cal__cell--empty" />;
                const key = toDateKey(d);
                const agg = board.byDateKey[key] || { available: 0, busy: 0, none: 0 };
                const isSelected = key === selectedKey;
                const canCount = agg.available;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`group-board-cal__cell${isSelected ? " is-selected" : ""}`}
                    onClick={() => setSelectedKey(key)}
                  >
                    <span className="group-board-cal__day">{d.getDate()}</span>
                    {canCount > 0 ? (
                      <span className="group-board-cal__badge group-board-cal__badge--ok">{canCount}</span>
                    ) : (
                      <span className="group-board-cal__badge group-board-cal__badge--none">·</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="group-board-detail">
          <div className="group-board-detail__head">
            <strong className="group-board-detail__date">{formatMonthDay(selectedKey)}</strong>
            <span className="group-board-detail__counts">
              🟢 가능 {selectedAgg.available} · 🔴 일정 {selectedAgg.busy}
            </span>
          </div>

          <div className="group-board-detail__body">
            {memberList.length === 0 ? (
              <p className="group-board-detail__empty">그룹에 멤버가 없습니다.</p>
            ) : (
              <>
                <DetailGroup label="🟢 가능" people={dayDetail.available} onName={openPersonCard} showDays />
                <DetailGroup label="🔴 일정 있음" people={dayDetail.busy} onName={openPersonCard} muted />
              </>
            )}
          </div>
        </div>

        <div className="group-board-sheet__foot">
          <button
            type="button"
            className="group-board-sheet__create"
            onClick={handleCreateField}
            disabled={inviteTargets.length === 0}
          >
            이 날짜로 현장 만들기{inviteTargets.length > 0 ? ` (가능 ${inviteTargets.length}명)` : ""}
          </button>
          <button
            type="button"
            className="group-board-sheet__invite"
            onClick={handleInviteAll}
            disabled={inviteTargets.length === 0}
          >
            전체 초대{inviteTargets.length > 0 ? ` (${inviteTargets.length}명)` : ""}
          </button>
        </div>
      </section>
    </div>
  );
}

function DetailGroup({ label, people, onName, muted = false, showDays = false }) {
  if (!people || people.length === 0) return null;
  return (
    <div className={`group-board-detail__group${muted ? " is-muted" : ""}`}>
      <span className="group-board-detail__group-label">
        {label} {people.length}
      </span>
      <div className="group-board-detail__names">
        {people.map((c) => (
          <button
            key={c.id}
            type="button"
            className="group-board-detail__name"
            onClick={() => onName?.(c)}
          >
            {c.name}
            {showDays && c.consecutiveDays > 0 ? (
              <span className="group-board-detail__days">{c.consecutiveDays}일 가능</span>
            ) : null}
            {showDays && c.coworkCount > 0 ? (
              <span className="group-board-detail__cowork">{c.coworkCount}회 함께</span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
