import React, { useState } from "react";
import { getScheduleColorOption } from "../../constants/scheduleColors";
import {
  entryKindLabel,
  formatEntryDateLabel,
  resolveEntryParticipantNames,
} from "../../utils/scheduleEntryHelpers";

function formatDateKeyLabel(dateKey) {
  if (!dateKey) return "";
  const [y, m, d] = String(dateKey).split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const dt = new Date(y, m - 1, d);
  return `${m}월 ${d}일 (${weekdays[dt.getDay()]})`;
}

/**
 * 일정 상세 바텀시트 — 조회 · 수정 · 공유 · 복사 · 삭제
 */
export default function ScheduleDetailSheet({
  open,
  entry,
  creatorLabel = "나",
  onClose,
  onEdit,
  onShare,
  onCopy,
  onDelete,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!open || !entry) return null;

  const tone = getScheduleColorOption(entry.colorId);
  const participants = resolveEntryParticipantNames(entry);
  const dateLabel = formatEntryDateLabel(entry);
  const siteName = entry.kind === "site" ? entry.address || entry.title : "";
  const memo = entry.memo || "";

  const handleClose = () => {
    setConfirmDelete(false);
    onClose?.();
  };

  const handleDeleteConfirm = () => {
    onDelete?.(entry);
    setConfirmDelete(false);
  };

  return (
    <div className="schedule-detail-sheet-root" data-open="true">
      <button type="button" className="schedule-detail-sheet-backdrop" aria-label="닫기" onClick={handleClose} />
      <section className="schedule-detail-sheet-panel" role="dialog" aria-modal="true" aria-label="일정 상세">
        <div className="schedule-detail-sheet-panel__handle" aria-hidden="true" />

        <header className="schedule-detail-sheet-panel__head">
          <span
            className="schedule-detail-sheet-panel__type"
            style={{ background: tone.bg, color: tone.text }}
          >
            {entryKindLabel(entry)}
          </span>
          <button type="button" className="schedule-detail-sheet-panel__close" onClick={handleClose} aria-label="닫기">
            ×
          </button>
        </header>

        <h2 className="schedule-detail-sheet-panel__title">{entry.title}</h2>

        <dl className="schedule-detail-sheet-panel__facts">
          {entry.kind === "site" && siteName ? (
            <>
              <dt>현장</dt>
              <dd>{siteName}</dd>
            </>
          ) : null}
          <dt>날짜</dt>
          <dd>{formatDateKeyLabel(dateLabel.includes("~") ? dateLabel.split("~")[0].trim() : dateLabel)}</dd>
          {dateLabel.includes("~") ? (
            <>
              <dt>종료일</dt>
              <dd>{formatDateKeyLabel(dateLabel.split("~")[1]?.trim())}</dd>
            </>
          ) : null}
          <dt>시간</dt>
          <dd>{entry.time}</dd>
          <dt>등록</dt>
          <dd>{creatorLabel}</dd>
          <dt>참여자</dt>
          <dd>{participants.length ? participants.join(", ") : "없음"}</dd>
          {memo ? (
            <>
              <dt>메모</dt>
              <dd className="schedule-detail-sheet-panel__memo">{memo}</dd>
            </>
          ) : null}
        </dl>

        {confirmDelete ? (
          <div className="schedule-detail-sheet-panel__confirm" role="alertdialog" aria-labelledby="schedule-delete-title">
            <p id="schedule-delete-title" className="schedule-detail-sheet-panel__confirm-text">
              이 일정을 삭제하시겠습니까?
            </p>
            <div className="schedule-detail-sheet-panel__confirm-actions">
              <button type="button" className="schedule-detail-sheet-panel__btn schedule-detail-sheet-panel__btn--ghost" onClick={() => setConfirmDelete(false)}>
                취소
              </button>
              <button type="button" className="schedule-detail-sheet-panel__btn schedule-detail-sheet-panel__btn--danger" onClick={handleDeleteConfirm}>
                삭제
              </button>
            </div>
          </div>
        ) : (
          <div className="schedule-detail-sheet-panel__actions">
            <button type="button" className="schedule-detail-sheet-panel__btn schedule-detail-sheet-panel__btn--primary" onClick={() => onEdit?.(entry)}>
              수정
            </button>
            <button type="button" className="schedule-detail-sheet-panel__btn" onClick={() => onShare?.(entry)}>
              공유
            </button>
            <button type="button" className="schedule-detail-sheet-panel__btn" onClick={() => onCopy?.(entry)}>
              복사
            </button>
            <button
              type="button"
              className="schedule-detail-sheet-panel__btn schedule-detail-sheet-panel__btn--danger-outline"
              onClick={() => setConfirmDelete(true)}
            >
              삭제
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
