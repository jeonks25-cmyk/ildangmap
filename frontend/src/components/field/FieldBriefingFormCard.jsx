import React, { useCallback, useEffect, useState } from "react";
import { BRIEFING_FORM_ROWS } from "../../utils/fieldBriefingForm";
import FieldCardMenu from "./FieldCardMenu";

export default function FieldBriefingFormCard({ form, defaultForm, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => ({ ...form }));

  useEffect(() => {
    if (!editing) setDraft({ ...form });
  }, [form, editing]);

  const save = useCallback(() => {
    onChange?.({ ...draft });
    setEditing(false);
  }, [draft, onChange]);

  const cancel = useCallback(() => {
    setDraft({ ...form });
    setEditing(false);
  }, [form]);

  const handleDelete = useCallback(() => {
    onChange?.({ ...defaultForm });
    setEditing(false);
  }, [defaultForm, onChange]);

  const setField = useCallback((key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  return (
    <section className="field-briefing-form" aria-label="현장 브리핑">
      <div className="field-briefing-form__card">
        <div className="field-briefing-form__head">
          <h2 className="field-briefing-form__title">현장 브리핑</h2>
          <FieldCardMenu
            ariaLabel="브리핑 메뉴"
            onEdit={() => setEditing(true)}
            onDelete={handleDelete}
          />
        </div>

        {!editing ? (
          <ul className="field-briefing-form__rows">
            {BRIEFING_FORM_ROWS.map(({ key, icon, label }) => (
              <li key={key} className="field-briefing-form__row">
                <span className="field-briefing-form__row-label" aria-hidden="true">
                  {icon} {label}
                </span>
                <span className="field-briefing-form__row-value">{form[key] || "—"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="field-briefing-form__edit">
            {BRIEFING_FORM_ROWS.map(({ key, icon, label }) => (
              <label key={key} className="field-briefing-form__field">
                <span className="field-briefing-form__field-cap">
                  {icon} {label}
                </span>
                <input
                  type="text"
                  value={draft[key] || ""}
                  onChange={(e) => setField(key, e.target.value)}
                  autoComplete="off"
                />
              </label>
            ))}
            <div className="field-briefing-form__edit-actions">
              <button type="button" className="field-briefing-form__save" onClick={save}>
                저장
              </button>
              <button type="button" className="field-briefing-form__cancel" onClick={cancel}>
                취소
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
