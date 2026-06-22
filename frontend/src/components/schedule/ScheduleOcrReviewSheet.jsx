import React, { useCallback, useState } from "react";
import { SCHEDULE_COLOR_OPTIONS, getScheduleColorDisplayLabel } from "../../constants/scheduleColors";
import { useScheduleColorAliasStore } from "../../store/useScheduleColorAliasStore";
import { SCHEDULE_DEFAULT_END_TIME, SCHEDULE_DEFAULT_START_TIME } from "../../constants/scheduleDefaults";
import { formatMonthDay } from "../../utils/fieldScheduleModel";
import { createScheduleOcrDraft } from "../../features/schedule-ocr/generator/scheduleDraftModel";

function cloneDrafts(list) {
  return (Array.isArray(list) ? list : []).map((item) => ({ ...item }));
}

export default function ScheduleOcrReviewSheet({
  open,
  drafts: initialDrafts = [],
  onClose,
  onConfirm,
  saving = false,
}) {
  const [rows, setRows] = useState(() => cloneDrafts(initialDrafts));
  const [defaultStart, setDefaultStart] = useState(SCHEDULE_DEFAULT_START_TIME);
  const [defaultEnd, setDefaultEnd] = useState(SCHEDULE_DEFAULT_END_TIME);
  const [defaultColor, setDefaultColor] = useState("blue");
  const aliasesByColorId = useScheduleColorAliasStore((s) => s.aliasesByColorId);

  React.useEffect(() => {
    if (!open) return;
    setRows(cloneDrafts(initialDrafts));
  }, [open, initialDrafts]);

  const selectedCount = rows.filter((r) => r.selected !== false).length;

  const updateRow = useCallback((id, patch) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }, []);

  const removeRow = useCallback((id) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

  const addRow = useCallback(() => {
    const draft = createScheduleOcrDraft({
      dateKey: rows[rows.length - 1]?.dateKey || "",
      title: "",
      startTime: defaultStart,
      endTime: defaultEnd,
      color: defaultColor,
    });
    if (draft) setRows((prev) => [...prev, draft]);
  }, [defaultColor, defaultEnd, defaultStart, rows]);

  const applyDefaultsToAll = () => {
    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        startTime: defaultStart,
        endTime: defaultEnd,
        color: defaultColor,
      }))
    );
  };

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const selected = rows.filter((r) => r.selected !== false && r.title?.trim() && r.dateKey);
    onConfirm?.(selected);
  };

  return (
    <div className="schedule-ocr-review-backdrop" role="presentation" onClick={onClose}>
      <form
        className="schedule-ocr-review"
        role="dialog"
        aria-modal="true"
        aria-label="OCR 일정 검토"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <header className="schedule-ocr-review__head">
          <h2>OCR 일정 검토</h2>
          <p>개인 일정으로 저장됩니다. 항목을 확인·수정한 뒤 저장하세요.</p>
          <button type="button" className="schedule-ocr-review__close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </header>

        <div className="schedule-ocr-review__defaults">
          <label>
            <span>기본 시작</span>
            <input type="time" value={defaultStart} onChange={(e) => setDefaultStart(e.target.value)} />
          </label>
          <label>
            <span>기본 종료</span>
            <input type="time" value={defaultEnd} onChange={(e) => setDefaultEnd(e.target.value)} />
          </label>
          <label>
            <span>색상</span>
            <select value={defaultColor} onChange={(e) => setDefaultColor(e.target.value)}>
              {SCHEDULE_COLOR_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {getScheduleColorDisplayLabel(opt.id, aliasesByColorId)}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="schedule-ocr-review__ghost" onClick={applyDefaultsToAll}>
            전체 적용
          </button>
        </div>

        <ul className="schedule-ocr-review__list">
          {rows.map((row) => (
            <li key={row.id} className="schedule-ocr-review__row">
              <label className="schedule-ocr-review__check">
                <input
                  type="checkbox"
                  checked={row.selected !== false}
                  onChange={(e) => updateRow(row.id, { selected: e.target.checked })}
                />
              </label>
              <input
                type="date"
                className="schedule-ocr-review__date"
                value={row.dateKey}
                onChange={(e) => updateRow(row.id, { dateKey: e.target.value })}
                aria-label={`${formatMonthDay(row.dateKey)} 날짜`}
              />
              <input
                type="text"
                className="schedule-ocr-review__title"
                value={row.title}
                onChange={(e) => updateRow(row.id, { title: e.target.value })}
                placeholder="공정명"
              />
              <button type="button" className="schedule-ocr-review__delete" onClick={() => removeRow(row.id)} aria-label="삭제">
                삭제
              </button>
            </li>
          ))}
        </ul>

        <button type="button" className="schedule-ocr-review__add" onClick={addRow}>
          + 일정 추가
        </button>

        <footer className="schedule-ocr-review__actions">
          <button type="button" className="schedule-ocr-review__ghost" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="schedule-ocr-review__primary" disabled={saving || selectedCount === 0}>
            {saving ? "저장 중…" : `${selectedCount}건 개인 일정 저장`}
          </button>
        </footer>
      </form>
    </div>
  );
}
