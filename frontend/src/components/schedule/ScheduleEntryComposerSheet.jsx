import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SCHEDULE_COLOR_OPTIONS } from "../../constants/scheduleColors";
import { SCHEDULE_DEFAULT_END_TIME, SCHEDULE_DEFAULT_START_TIME } from "../../constants/scheduleDefaults";
import SchedulePasteImportPanel from "./SchedulePasteImportPanel";
import ScheduleShareSheet from "./ScheduleShareSheet";
import ScheduleParticipantPicker from "./ScheduleParticipantPicker";
import { useUiStore } from "../../store/useUiStore";

const ENTRY_TYPES = [
  { id: "site", label: "현장 일정" },
  { id: "personal", label: "개인 일정" },
];

/** 일정 추가·수정 — 현장/개인 통합 */
export default function ScheduleEntryComposerSheet({
  open,
  dateKey,
  initial,
  onClose,
  onSubmitSite,
  onSubmitPersonal,
  onOcrReview,
}) {
  const [entryType, setEntryType] = useState("site");
  const [title, setTitle] = useState("");
  const [workDateStart, setWorkDateStart] = useState("");
  const [workDateEnd, setWorkDateEnd] = useState("");
  const [startTime, setStartTime] = useState(SCHEDULE_DEFAULT_START_TIME);
  const [endTime, setEndTime] = useState(SCHEDULE_DEFAULT_END_TIME);
  const [color, setColor] = useState("blue");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [participantIds, setParticipantIds] = useState([]);
  const showAppToast = useUiStore((s) => s.showAppToast);

  useEffect(() => {
    if (!open) return;
    const seed = initial || {};
    const seedDate = seed.dateKey || seed.workDateStart || dateKey || "";
    setEntryType(seed.entryType || "site");
    setTitle(seed.title || "");
    setWorkDateStart(seedDate);
    setWorkDateEnd(seed.workDateEnd || seed.endDateKey || seedDate);
    setStartTime(seed.startTime || SCHEDULE_DEFAULT_START_TIME);
    setEndTime(seed.endTime || SCHEDULE_DEFAULT_END_TIME);
    setColor(seed.color || "blue");
    setMemo(seed.memo || "");
    setSaving(false);
    setShareOpen(false);
    setParticipantIds([]);
  }, [open, initial, dateKey]);

  const handlePasteApply = useCallback((result) => {
    if (result.title) setTitle(result.title);
    if (result.dateKey) {
      setWorkDateStart(result.dateKey);
      setWorkDateEnd(result.dateKey);
    }
    if (result.startTime) setStartTime(result.startTime);
    if (result.endTime) setEndTime(result.endTime);
    if (result.memo != null) {
      setMemo(result.memo);
    }
  }, []);

  const endDate = workDateEnd || workDateStart;
  const shareInput = useMemo(
    () => ({
      id: initial?.id,
      entryType,
      title: title.trim(),
      workDateStart,
      workDateEnd: endDate,
      startTime,
      endTime,
      memo: memo.trim(),
    }),
    [initial?.id, entryType, title, workDateStart, endDate, startTime, endTime, memo]
  );

  if (!open) return null;

  const isEdit = Boolean(initial?.id);
  const isSite = entryType === "site";
  const canSave = title.trim() && workDateStart && endDate && startTime && endTime && endDate >= workDateStart;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSave || saving) return;
    const payload = {
      id: initial?.id,
      title: title.trim(),
      dateKey: workDateStart,
      endDateKey: endDate,
      workDateStart,
      workDateEnd: endDate,
      startTime,
      endTime,
      color,
      memo: memo.trim(),
    };
    setSaving(true);
    try {
      if (entryType === "personal") {
        await onSubmitPersonal?.(payload);
      } else {
        await onSubmitSite?.({ ...payload, participantIds });
      }
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="schedule-entry-composer-backdrop" role="presentation" onClick={onClose}>
      <form
        className="schedule-entry-composer"
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "일정 수정" : "일정 추가"}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <header className="schedule-entry-composer__head">
          <h2>{isEdit ? "일정 수정" : "일정 추가"}</h2>
          <div className="schedule-entry-composer__head-actions">
            {isEdit ? (
              <button
                type="button"
                className="schedule-entry-composer__share"
                onClick={() => setShareOpen(true)}
              >
                공유하기
              </button>
            ) : null}
            <button type="button" className="schedule-entry-composer__close" onClick={onClose} aria-label="닫기">
              ×
            </button>
          </div>
        </header>

        {!isEdit ? (
          <SchedulePasteImportPanel
            open={open}
            onApply={handlePasteApply}
            onOcrReview={onOcrReview}
            referenceDate={workDateStart ? new Date(`${workDateStart}T12:00:00`) : new Date()}
          />
        ) : null}

        <label className="schedule-entry-composer__field">
          <span>제목</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={entryType === "personal" ? "예: 치과, 가족여행" : "예: 둔산필름, 용운타일"}
            required
          />
        </label>

        <fieldset className="schedule-entry-composer__type">
          <legend>일정유형</legend>
          <div className="schedule-entry-composer__type-row">
            {ENTRY_TYPES.map((opt) => (
              <label key={opt.id} className="schedule-entry-composer__type-opt">
                <input
                  type="radio"
                  name="entryType"
                  value={opt.id}
                  checked={entryType === opt.id}
                  onChange={() => setEntryType(opt.id)}
                  disabled={isEdit && initial?.entryType && initial.entryType !== opt.id}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {isSite ? (
          <div className="schedule-entry-composer__row">
            <label className="schedule-entry-composer__field">
              <span>시작일</span>
              <input
                type="date"
                value={workDateStart}
                onChange={(e) => {
                  const next = e.target.value;
                  setWorkDateStart(next);
                  if (!workDateEnd || workDateEnd < next) setWorkDateEnd(next);
                }}
                required
              />
            </label>
            <label className="schedule-entry-composer__field">
              <span>종료일</span>
              <input
                type="date"
                value={endDate}
                min={workDateStart || undefined}
                onChange={(e) => setWorkDateEnd(e.target.value)}
                required
              />
            </label>
          </div>
        ) : (
          <label className="schedule-entry-composer__field">
            <span>날짜</span>
            <input
              type="date"
              value={workDateStart}
              onChange={(e) => {
                setWorkDateStart(e.target.value);
                setWorkDateEnd(e.target.value);
              }}
              required
            />
          </label>
        )}

        <div className="schedule-entry-composer__row">
          <label className="schedule-entry-composer__field">
            <span>시작시간</span>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          </label>
          <label className="schedule-entry-composer__field">
            <span>종료시간</span>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
          </label>
        </div>

        {isSite ? (
          <ScheduleParticipantPicker selectedIds={participantIds} onChange={setParticipantIds} />
        ) : null}

        {isSite ? (
          <p className="schedule-entry-composer__hint" aria-disabled="true">
            반복 여부 — 추후 지원 예정
          </p>
        ) : null}

        <fieldset className="schedule-entry-composer__colors">
          <legend>색상</legend>
          <div className="schedule-entry-composer__color-grid">
            {SCHEDULE_COLOR_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`schedule-entry-composer__color-btn${color === opt.id ? " is-selected" : ""}`}
                style={{ background: opt.bg, color: opt.text }}
                aria-label={opt.label}
                aria-pressed={color === opt.id}
                onClick={() => setColor(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="schedule-entry-composer__field">
          <span>메모</span>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder={entryType === "personal" ? "메모 (선택)" : "현장 메모 (선택)"}
            rows={3}
          />
        </label>

        <div className="schedule-entry-composer__actions">
          <button type="button" className="schedule-entry-composer__ghost" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="schedule-entry-composer__primary" disabled={!canSave || saving}>
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </form>
      <ScheduleShareSheet
        open={shareOpen}
        scheduleInput={shareInput}
        onClose={() => setShareOpen(false)}
        onToast={showAppToast}
      />
    </div>
  );
}
