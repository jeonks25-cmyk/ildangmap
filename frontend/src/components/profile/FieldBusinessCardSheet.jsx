import React, { useState } from "react";
import { createPortal } from "react-dom";
import CoworkHistorySheet from "./CoworkHistorySheet";
import PersonAvailabilityCalendar from "./PersonAvailabilityCalendar";
import {
  formatBirthYearLabel,
  formatCraftCareerLine,
  formatPersonDailyPayLabel,
  toFieldPerson,
} from "../../utils/fieldProfileCard";

/**
 * 인원 상세 — 투입 가능 여부 중심 (이름·직종·지역 + 달력 + 연락).
 */
export default function FieldBusinessCardSheet({
  open,
  person,
  ownerId,
  viewerUserId = null,
  contactUserId = null,
  coworkHistoryEntries = [],
  isUnregistered = false,
  onClose,
  onEdit,
  onDelete,
  onCall,
  onKakao,
  onInvite,
  onSmsInvite,
  onKakaoInvite,
  onCopyInvite,
}) {
  const [historyOpen, setHistoryOpen] = useState(false);

  if (!open || !person) return null;

  const p = toFieldPerson(person);
  if (!p) return null;

  const birthLabel = formatBirthYearLabel(p.birthYear);
  const residence = p.residence || "지역 미입력";
  const craftCareerLine = formatCraftCareerLine(p);
  const payLine = formatPersonDailyPayLabel(p.basePay);
  const headline = person.displayName || p.name;

  return createPortal(
    <div className="field-card-sheet field-card-sheet--person-detail" role="dialog" aria-modal="true" aria-label={`${headline} 인원 상세`}>
      <button type="button" className="field-card-sheet__backdrop" aria-label="닫기" onClick={onClose} />
      <div className="field-card-sheet__panel">
        <div className="field-card-sheet__grab" aria-hidden="true" />
        <button type="button" className="field-card-sheet__x" onClick={onClose} aria-label="닫기">
          ✕
        </button>

        <div className="field-card-sheet__scroll">
          <header className="person-detail-head">
            <h2 className="person-detail-head__name">{headline}</h2>
            {birthLabel ? <p className="person-detail-head__birth">{birthLabel}</p> : null}
            <p className="person-detail-head__region">{residence}</p>
            {craftCareerLine ? <p className="person-detail-head__craft">{craftCareerLine}</p> : null}
            {payLine ? <p className="person-detail-head__pay">{payLine}</p> : null}
            {person.memo ? <p className="person-detail-head__memo">{person.memo}</p> : null}
          </header>

          <PersonAvailabilityCalendar
            ownerId={ownerId}
            personName={p.name}
            viewerUserId={viewerUserId}
            contactUserId={contactUserId}
          />

          {coworkHistoryEntries.length > 0 ? (
            <button type="button" className="person-detail-history-link" onClick={() => setHistoryOpen(true)}>
              함께한 현장 이력 보기
            </button>
          ) : null}
        </div>

        <div className="person-detail-manage" role="group" aria-label="인원 관리">
          <button type="button" className="person-detail-manage__btn" onClick={() => onEdit?.()}>
            인원 수정
          </button>
          <button type="button" className="person-detail-manage__btn person-detail-manage__btn--danger" onClick={() => onDelete?.()}>
            인원 삭제
          </button>
        </div>

        {isUnregistered ? (
          <div className="field-card-sheet__actions field-card-sheet__actions--invite" role="group" aria-label={`${p.name} 초대`}>
            <button type="button" className="field-card-sheet__act" onClick={() => onSmsInvite?.()}>
              문자 초대
            </button>
            <button
              type="button"
              className="field-card-sheet__act field-card-sheet__act--primary"
              onClick={() => onKakaoInvite?.()}
            >
              카카오톡 초대
            </button>
            <button type="button" className="field-card-sheet__act" onClick={() => onCopyInvite?.()}>
              링크 복사
            </button>
          </div>
        ) : (
          <div className="field-card-sheet__actions" role="group" aria-label={`${p.name} 연락`}>
            <button type="button" className="field-card-sheet__act" onClick={() => onCall?.()}>
              전화
            </button>
            <button type="button" className="field-card-sheet__act" onClick={() => onKakao?.()}>
              카톡
            </button>
            <button
              type="button"
              className="field-card-sheet__act field-card-sheet__act--primary"
              onClick={() => onInvite?.()}
            >
              현장초대
            </button>
          </div>
        )}
      </div>
      <CoworkHistorySheet
        open={historyOpen}
        personName={p.name}
        entries={coworkHistoryEntries}
        onClose={() => setHistoryOpen(false)}
      />
    </div>,
    document.body
  );
}
