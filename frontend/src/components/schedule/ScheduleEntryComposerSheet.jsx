import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SCHEDULE_COLOR_OPTIONS } from "../../constants/scheduleColors";
import { SCHEDULE_DEFAULT_END_TIME, SCHEDULE_DEFAULT_START_TIME } from "../../constants/scheduleDefaults";
import SchedulePasteImportPanel from "./SchedulePasteImportPanel";
import ScheduleParticipantPicker from "./ScheduleParticipantPicker";
import { useUiStore } from "../../store/useUiStore";
import { toDateKey } from "../../utils/fieldScheduleModel";
import { markStructureSaved } from "../../features/site-import/parser/siteImportStructureMetrics";
import { applyScheduleImportTitleToForm } from "../../features/schedule-ocr/utils/scheduleFormApplyTitle";

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
  const [participantIds, setParticipantIds] = useState([]);
  const showAppToast = useUiStore((s) => s.showAppToast);
  const importSnapshotRef = useRef(null);
  const pendingTitleApplyRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const seed = initial || {};
    const seedDate = seed.dateKey || seed.workDateStart || dateKey || toDateKey(new Date());
    setEntryType(seed.entryType || "site");
    setTitle(seed.title || "");
    setWorkDateStart(seedDate);
    setWorkDateEnd(seed.workDateEnd || seed.endDateKey || seedDate);
    setStartTime(seed.startTime || SCHEDULE_DEFAULT_START_TIME);
    setEndTime(seed.endTime || SCHEDULE_DEFAULT_END_TIME);
    setColor(seed.color || "blue");
    setMemo(seed.memo || "");
    setSaving(false);
    setParticipantIds(Array.isArray(seed.participantIds) ? seed.participantIds.map(String) : []);
    importSnapshotRef.current = null;
    pendingTitleApplyRef.current = null;
  }, [open, initial, dateKey]);

  const handlePasteApply = useCallback((result) => {
    const finalAppliedTitle = applyScheduleImportTitleToForm(result);
    const parserFinalTitle = String(result?.finalTitle || result?.title || "").trim();

    importSnapshotRef.current = {
      sessionId: result.metricsSessionId,
      title: finalAppliedTitle,
      structureOk: Boolean(result.structureOk),
    };
    pendingTitleApplyRef.current = {
      expected: finalAppliedTitle,
      parserFinalTitle,
    };
    if (finalAppliedTitle) setTitle(finalAppliedTitle);
    if (result.dateKey) {
      setWorkDateStart(result.dateKey);
      setWorkDateEnd(result.dateKey);
    }
    if (result.timeExtracted) {
      if (result.startTime) setStartTime(result.startTime);
      if (result.endTime) setEndTime(result.endTime);
    }
    if (result.memo != null) {
      setMemo(result.memo);
    }
  }, []);

  useLayoutEffect(() => {
    const pending = pendingTitleApplyRef.current;
    if (!pending?.expected) return;
    pendingTitleApplyRef.current = null;
    if (title !== pending.expected) {
      console.error("[BUG] finalTitle was overwritten before form apply", {
        expected: pending.expected,
        actual: title,
        parserFinalTitle: pending.parserFinalTitle,
      });
    }
  }, [title]);

  const endDate = workDateEnd || workDateStart;

  if (!open) return null;

  const isEdit = Boolean(initial?.id);
  const isSite = entryType === "site";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    const resolvedStart = workDateStart || dateKey || toDateKey(new Date());
    const resolvedEnd = workDateEnd || endDate || resolvedStart;
    const resolvedStartTime = startTime || SCHEDULE_DEFAULT_START_TIME;
    const resolvedEndTime = endTime || SCHEDULE_DEFAULT_END_TIME;
    const trimmedTitle = title.trim();
    const readyToSave =
      trimmedTitle &&
      resolvedStart &&
      resolvedEnd &&
      resolvedStartTime &&
      resolvedEndTime &&
      resolvedEnd >= resolvedStart;

    if (!readyToSave) {
      showAppToast?.("제목, 날짜, 시간을 확인해 주세요");
      return;
    }

    const payload = {
      id: initial?.id,
      title: trimmedTitle,
      dateKey: resolvedStart,
      endDateKey: resolvedEnd,
      workDateStart: resolvedStart,
      workDateEnd: resolvedEnd,
      startTime: resolvedStartTime,
      endTime: resolvedEndTime,
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
      const snap = importSnapshotRef.current;
      if (snap?.sessionId) {
        markStructureSaved(snap.sessionId, {
          savedWithoutEdit: snap.structureOk && snap.title === trimmedTitle,
          finalTitle: trimmedTitle,
        });
      }
      onClose?.();
    } catch (error) {
      console.error("[ScheduleEntryComposerSheet] save failed", error);
      showAppToast?.(error?.message || "일정 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
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
          <button type="button" className="schedule-entry-composer__close" onClick={onClose} aria-label="닫기">
            ×
          </button>
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
          <button type="submit" className="schedule-entry-composer__primary" disabled={saving}>
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}
