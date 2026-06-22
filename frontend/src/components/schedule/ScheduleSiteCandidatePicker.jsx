import React, { useId, useState } from "react";

/**
 * OCR 후 현장 후보 줄 선택 — 자동 일정 생성 전 단계
 */
export default function ScheduleSiteCandidatePicker({
  candidates = [],
  selectedId: initialSelectedId,
  onConfirm,
  onCancel,
  busy = false,
}) {
  const groupId = useId();
  const [selectedId, setSelectedId] = useState(initialSelectedId || candidates[0]?.id || "");

  if (!candidates.length) return null;

  const selected = candidates.find((c) => c.id === selectedId) || candidates[0];

  return (
    <section className="schedule-site-candidates" aria-label="현장 후보 선택">
      <header className="schedule-site-candidates__head">
        <h4 className="schedule-site-candidates__title">현장 후보를 찾았습니다</h4>
        <p className="schedule-site-candidates__lead">
          일정에 넣을 현장 줄을 고르세요. 동·호·비번이 있는 줄이 위에 표시됩니다.
        </p>
      </header>

      <ul className="schedule-site-candidates__list" role="radiogroup" aria-labelledby={`${groupId}-label`}>
        <span id={`${groupId}-label`} className="schedule-site-candidates__sr-only">
          현장 후보
        </span>
        {candidates.map((row) => {
          const checked = row.id === selectedId;
          return (
            <li key={row.id}>
              <label className={`schedule-site-candidates__option${checked ? " is-selected" : ""}`}>
                <input
                  type="radio"
                  name={groupId}
                  value={row.id}
                  checked={checked}
                  onChange={() => setSelectedId(row.id)}
                  disabled={busy}
                />
                <span className="schedule-site-candidates__option-text">{row.text}</span>
                {row.score > 0 ? (
                  <span className="schedule-site-candidates__score" aria-hidden="true">
                    {row.score}
                  </span>
                ) : null}
              </label>
            </li>
          );
        })}
      </ul>

      <div className="schedule-site-candidates__actions">
        <button
          type="button"
          className="schedule-site-candidates__confirm"
          disabled={!selected?.text || busy}
          onClick={() => onConfirm?.(selected)}
        >
          {busy ? "채우는 중…" : "선택한 줄로 일정 채우기"}
        </button>
        {onCancel ? (
          <button type="button" className="schedule-site-candidates__cancel" onClick={onCancel} disabled={busy}>
            취소
          </button>
        ) : null}
      </div>
    </section>
  );
}
