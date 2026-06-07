import React, { useEffect, useState } from "react";
import { CRAFT_KEYS, CRAFT_LABEL } from "../../utils/jobModel";
import { scheduleToEditForm, editFormToSchedulePatch } from "../../utils/scheduleFieldOpsStorage";

export default function ScheduleEditSheet({ open, schedule, onClose, onSave }) {
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (open && schedule) setForm(scheduleToEditForm(schedule));
    if (!open) setForm(null);
  }, [open, schedule]);

  if (!open || !schedule || !form) return null;

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const patch = editFormToSchedulePatch(form);
    onSave?.(patch, form);
    onClose?.();
  };

  return (
    <div className="schedule-edit-sheet" role="presentation" onClick={onClose}>
      <form
        className="schedule-edit-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-label="일정 수정"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <header className="schedule-edit-sheet__head">
          <h2>일정 수정</h2>
          <button type="button" className="schedule-edit-sheet__close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </header>

        <label className="schedule-edit-sheet__field">
          <span>현장명</span>
          <input value={form.title} onChange={(e) => set("title", e.target.value)} required />
        </label>
        <label className="schedule-edit-sheet__field">
          <span>주소</span>
          <input value={form.fullAddress} onChange={(e) => set("fullAddress", e.target.value)} required />
        </label>
        <div className="schedule-edit-sheet__row">
          <label className="schedule-edit-sheet__field">
            <span>시작일</span>
            <input type="date" value={form.workDate} onChange={(e) => set("workDate", e.target.value)} required />
          </label>
          <label className="schedule-edit-sheet__field">
            <span>종료일</span>
            <input type="date" value={form.workDateEnd} onChange={(e) => set("workDateEnd", e.target.value)} required />
          </label>
        </div>
        <div className="schedule-edit-sheet__row">
          <label className="schedule-edit-sheet__field">
            <span>시작시간</span>
            <input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} required />
          </label>
          <label className="schedule-edit-sheet__field">
            <span>종료시간</span>
            <input type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} required />
          </label>
        </div>
        <label className="schedule-edit-sheet__field">
          <span>공정</span>
          <select value={form.craft} onChange={(e) => set("craft", e.target.value)}>
            {CRAFT_KEYS.map((key) => (
              <option key={key} value={key}>
                {CRAFT_LABEL[key] || key}
              </option>
            ))}
          </select>
        </label>
        <div className="schedule-edit-sheet__row">
          <label className="schedule-edit-sheet__field">
            <span>일당</span>
            <input
              inputMode="numeric"
              value={form.payAmount}
              onChange={(e) => set("payAmount", e.target.value.replace(/[^\d]/g, ""))}
              placeholder="150000"
            />
          </label>
          <label className="schedule-edit-sheet__field">
            <span>인원</span>
            <input
              inputMode="numeric"
              value={form.crewCount}
              onChange={(e) => set("crewCount", e.target.value.replace(/[^\d]/g, ""))}
            />
          </label>
        </div>
        <label className="schedule-edit-sheet__field">
          <span>비밀번호</span>
          <input
            value={form.accessPassword || ""}
            onChange={(e) => set("accessPassword", e.target.value)}
            placeholder="출입 비번"
          />
        </label>

        <button type="submit" className="schedule-edit-sheet__submit">
          저장
        </button>
      </form>
    </div>
  );
}
