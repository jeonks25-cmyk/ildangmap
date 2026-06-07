import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildContactsList, useContactsStore } from "../../store/useContactsStore";
import { useSettlementStore } from "../../store/useSettlementStore";
import { useUserStore } from "../../store/useUserStore";
import { useJobStore } from "../../store/useJobStore";
import { useUiStore } from "../../store/useUiStore";
import { useUserMapPreferences } from "../../context/UserMapPreferencesContext";
import { usePersonCard } from "../../context/PersonCardContext";
import { CONTACT_QUICK_MODE, quickContactSiteAction } from "../../utils/contactQuickAction";
import { buildScheduleRecommendation } from "../../utils/fieldTeamRosterModel";
import { buildPersonLines } from "../../utils/fieldProfileCard";
import { contactStableUserId } from "../../utils/fieldContactsMock";
import { buildUrgentHelpJobFromSchedule } from "../../utils/urgentHelpFromSchedule";
import FieldTeamRosterSheet from "./FieldTeamRosterSheet";

function RecommendRow({ row, checked, onToggle }) {
  const { contact, tier } = row;
  const { openPersonCard } = usePersonCard();
  const identityLine = buildPersonLines(contact, "invite").lines.join(" · ");

  return (
    <label className={`field-recommend__row field-recommend__row--${tier.tone}`}>
      <input
        type="checkbox"
        className="field-recommend__check"
        checked={checked}
        onChange={() => onToggle(contact.id)}
        aria-label={`${contact.name} 초대 선택`}
      />
      <span className="field-recommend__row-body">
        <button
          type="button"
          className="field-recommend__name-btn"
          onClick={(e) => {
            e.preventDefault();
            openPersonCard(contact);
          }}
        >
          {contact.name}
        </button>
        {identityLine ? <span className="field-recommend__identity">{identityLine}</span> : null}
      </span>
      <span className={`field-recommend__tier field-recommend__tier--${tier.tone}`}>
        {tier.dot} {tier.label}
      </span>
    </label>
  );
}

/**
 * 현장 등록 직후 — 선택한 작업 날짜 기준 "가능한 팀원" 자동 추천 시트.
 * - 추천 인원 기본 체크 → [전체 초대] 1탭으로 구조화 초대 + 채팅 초대 동시 발송
 * - 인원 부족 시 [긴급 헬프 등록](기존 긴급헬프 재사용)
 * - [직접 선택하기] → 기존 FieldTeamRosterSheet 오픈(삭제 금지·유지)
 * 신규 데이터 모델 없음 — useFieldScheduleStore + 기존 초대/헬프 함수 재사용.
 */
export default function FieldTeamRecommendSheet({
  open,
  job,
  scheduleId = null,
  workDateStart,
  workDateEnd,
  onClose,
}) {
  const navigate = useNavigate();
  const { prefs } = useUserMapPreferences();
  const schedules = useSettlementStore((s) => s.schedules);
  const inviteContactsToSchedule = useSettlementStore((s) => s.inviteContactsToSchedule);
  const createJobPost = useJobStore((s) => s.createJobPost);
  const favoriteById = useContactsStore((s) => s.favoriteById);
  const memoById = useContactsStore((s) => s.memoById);
  const showAppToast = useUiStore((s) => s.showAppToast);
  const myUserId = useUserStore((s) => s.session?.userId ?? s.profile?.userId ?? 1);
  const myName = useUserStore((s) => s.profile?.name || s.profile?.nickname || "현장 소장");

  const [manualOpen, setManualOpen] = useState(false);
  const [checkedById, setCheckedById] = useState({});

  const startKey = workDateStart || job?.workDate;
  const endKey = workDateEnd || job?.workDateEnd || job?.workDate;
  const requiredCount = Math.max(1, Number(job?.crewCount) || Number(job?.details?.crewCount) || 1);

  const contacts = useMemo(
    () => buildContactsList(favoriteById, memoById),
    [favoriteById, memoById]
  );

  const recommendation = useMemo(
    () =>
      buildScheduleRecommendation({
        contacts,
        workDateStart: startKey,
        workDateEnd: endKey,
        schedules,
        regionLabel: prefs?.regionLabel,
        requiredCount,
      }),
    [contacts, startKey, endKey, schedules, prefs?.regionLabel, requiredCount]
  );

  const recommendedIdsKey = recommendation.recommended.map((r) => r.contact.id).join(",");

  useEffect(() => {
    if (!open) return;
    const next = {};
    recommendation.recommended.forEach((r) => {
      next[r.contact.id] = true;
    });
    setCheckedById(next);
    setManualOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, recommendedIdsKey]);

  const onToggle = useCallback((id) => {
    setCheckedById((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const checkedContacts = useMemo(
    () => recommendation.recommended.filter((r) => checkedById[r.contact.id]).map((r) => r.contact),
    [recommendation.recommended, checkedById]
  );

  const recordStructuredInvites = useCallback(
    (list) => {
      if (!scheduleId) return;
      const invitees = (Array.isArray(list) ? list : [])
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

  const handleInviteChecked = useCallback(() => {
    if (!job) return;
    if (!checkedContacts.length) {
      showAppToast("초대할 사람을 선택하세요");
      return;
    }
    let sent = 0;
    const invited = [];
    checkedContacts.forEach((contact) => {
      if (quickContactSiteAction(contact, job, CONTACT_QUICK_MODE.INVITE)) {
        sent += 1;
        invited.push(contact);
      }
    });
    if (!sent) {
      showAppToast("초대를 보내지 못했습니다");
      return;
    }
    recordStructuredInvites(invited);
    showAppToast(`${sent}명에게 초대를 보냈습니다`);
    onClose?.();
  }, [checkedContacts, job, onClose, recordStructuredInvites, showAppToast]);

  const handleUrgentHelp = useCallback(async () => {
    const schedule = (Array.isArray(schedules) ? schedules : []).find(
      (s) => s && String(s.id) === String(scheduleId)
    );
    if (!schedule) {
      showAppToast("긴급헬프를 등록할 일정을 찾지 못했습니다");
      return;
    }
    const helpJob = buildUrgentHelpJobFromSchedule(schedule, {
      shortageCount: Math.max(1, recommendation.shortage),
    });
    if (!helpJob) return;
    await createJobPost(helpJob);
    showAppToast("긴급헬프 공고를 등록했습니다 · 지도에서 확인하세요");
    onClose?.();
    navigate("/map", { state: { focusUrgent: true } });
  }, [createJobPost, navigate, onClose, recommendation.shortage, scheduleId, schedules, showAppToast]);

  if (!open || !job) return null;

  if (manualOpen) {
    return (
      <FieldTeamRosterSheet
        open
        job={job}
        scheduleId={scheduleId}
        workDateStart={startKey}
        workDateEnd={endKey}
        onClose={() => setManualOpen(false)}
      />
    );
  }

  const siteTitle = job.title || "새 현장";
  const checkedCount = checkedContacts.length;
  const isShort = recommendation.shortage > 0;

  return (
    <div className="field-recommend-sheet" role="presentation" onClick={onClose}>
      <section
        className="field-recommend-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-label="가능한 팀원 추천"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="field-recommend-sheet__head">
          <p className="field-recommend-sheet__eyebrow">현장 등록 완료 · 자동 추천</p>
          <h2 className="field-recommend-sheet__title">
            {recommendation.dateRangeLabel} {siteTitle}
          </h2>
          <p className="field-recommend-sheet__count">
            가능한 팀원 <strong>{recommendation.availableCount}명</strong>
            <span className="field-recommend-sheet__req"> · 필요 {requiredCount}명</span>
          </p>
        </header>

        {isShort ? (
          <div className="field-recommend-sheet__shortage" role="alert">
            <p className="field-recommend-sheet__shortage-line">
              필요 인원 {requiredCount}명 · 가능 인원 {recommendation.availableCount}명
            </p>
            <p className="field-recommend-sheet__shortage-warn">⚠️ 인원이 부족합니다</p>
            <button
              type="button"
              className="field-recommend-sheet__urgent"
              onClick={handleUrgentHelp}
            >
              긴급 헬프 등록
            </button>
          </div>
        ) : null}

        <div className="field-recommend-sheet__list">
          {recommendation.recommended.length === 0 ? (
            <p className="field-recommend-sheet__empty">이 날짜에 비는 팀원이 없습니다. 직접 선택하거나 긴급헬프를 등록하세요.</p>
          ) : (
            recommendation.recommended.map((row) => (
              <RecommendRow
                key={row.contact.id}
                row={row}
                checked={Boolean(checkedById[row.contact.id])}
                onToggle={onToggle}
              />
            ))
          )}
        </div>

        <div className="field-recommend-sheet__foot">
          <button
            type="button"
            className="field-recommend-sheet__invite-all"
            onClick={handleInviteChecked}
            disabled={checkedCount === 0}
          >
            전체 초대{checkedCount > 0 ? ` (${checkedCount}명)` : ""}
          </button>
          <button
            type="button"
            className="field-recommend-sheet__manual"
            onClick={() => setManualOpen(true)}
          >
            직접 선택하기
          </button>
        </div>
      </section>
    </div>
  );
}
