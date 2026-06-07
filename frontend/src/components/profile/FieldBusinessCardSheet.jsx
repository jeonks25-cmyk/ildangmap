import React, { useState } from "react";
import { createPortal } from "react-dom";
import CoworkHistorySheet from "./CoworkHistorySheet";
import PersonAvailabilityCalendar from "./PersonAvailabilityCalendar";
import { CRAFT_LABEL } from "../../utils/jobModel";
import { toFieldPerson } from "../../utils/fieldProfileCard";

/**
 * 인원 상세 — 투입 가능 여부 중심 (이름·직종·지역 + 달력 + 연락).
 */
export default function FieldBusinessCardSheet({
  open,
  person,
  ownerId,
  coworkHistoryEntries = [],
  isUnregistered = false,
  onClose,
  onCall,
  onKakao,
  onInvite,
  onSmsInvite,
  onKakaoInvite,
}) {
  const [historyOpen, setHistoryOpen] = useState(false);

  if (!open || !person) return null;

  const p = toFieldPerson(person);
  if (!p) return null;

  const craftLabel = CRAFT_LABEL[p.craft] || p.craftLabel || p.craft || "필름";
  const careerYears = Number.isFinite(Number(p.careerYears)) ? Number(p.careerYears) : null;
  const craftCareerLine = careerYears ? `${craftLabel} ${careerYears}년` : craftLabel;
  const residence = p.residence || "지역 미입력";

  return createPortal(
    <div className="field-card-sheet field-card-sheet--person-detail" role="dialog" aria-modal="true" aria-label={`${p.name} 인원 상세`}>
      <button type="button" className="field-card-sheet__backdrop" aria-label="닫기" onClick={onClose} />
      <div className="field-card-sheet__panel">
        <div className="field-card-sheet__grab" aria-hidden="true" />
        <button type="button" className="field-card-sheet__x" onClick={onClose} aria-label="닫기">
          ✕
        </button>

        <div className="field-card-sheet__scroll">
          <header className="person-detail-head">
            <h2 className="person-detail-head__name">{p.name}</h2>
            <p className="person-detail-head__craft">{craftCareerLine}</p>
            <p className="person-detail-head__region">{residence}</p>
          </header>

          {isUnregistered ? (
            <span className="field-card-sheet__unreg-badge">일당맵 미가입</span>
          ) : null}

          <PersonAvailabilityCalendar ownerId={ownerId} personName={p.name} />

          {coworkHistoryEntries.length > 0 ? (
            <button type="button" className="person-detail-history-link" onClick={() => setHistoryOpen(true)}>
              함께한 현장 이력 보기
            </button>
          ) : null}
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
