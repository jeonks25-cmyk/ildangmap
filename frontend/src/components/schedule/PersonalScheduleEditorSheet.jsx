import React, { useEffect, useState } from "react";

/** 개인 일정 추가·수정 — 시트만 담당, 저장은 부모 콜백 */
export default function PersonalScheduleEditorSheet({ open, mode, initialTitle, dateKey, onClose, onSave }) {
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(initialTitle || "");
  }, [open, initialTitle]);

  if (!open) return null;

  const handleSave = () => {
    const clean = title.trim();
    if (!clean) return;
    onSave?.({ title: clean, dateKey });
    onClose?.();
  };

  return (
    <div className="personal-schedule-editor-backdrop" role="presentation" onClick={onClose}>
      <div
        className="personal-schedule-editor-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={mode === "add" ? "개인 일정 추가" : "개인 일정 수정"}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="personal-schedule-editor-sheet__grab" aria-hidden />
        <h2 className="personal-schedule-editor-sheet__title">{mode === "add" ? "개인 일정 추가" : "개인 일정 수정"}</h2>
        <p className="personal-schedule-editor-sheet__hint">병원·가족·타 현장 등 — 외부에는 불가능으로만 표시됩니다.</p>
        <label className="personal-schedule-editor-sheet__label">
          제목
          <input
            type="text"
            className="personal-schedule-editor-sheet__input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 병원, 가족 행사"
          />
        </label>
        <div className="personal-schedule-editor-sheet__actions">
          <button type="button" className="personal-schedule-editor-sheet__ghost" onClick={onClose}>
            취소
          </button>
          <button type="button" className="personal-schedule-editor-sheet__primary" onClick={handleSave} disabled={!title.trim()}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
