import React, { useEffect, useState } from "react";
import { ACTIVITY_REGIONS, formatRegionsLabel, normalizeActivityRegions } from "../../constants/activityRegions";

/**
 * 활동지역 복수 선택 시트 — 프로필·인원 수정 공통.
 */
export default function ActivityRegionsSheet({ open, value, onChange, onClose, title = "활동지역" }) {
  const [draft, setDraft] = useState(() => normalizeActivityRegions(value));

  useEffect(() => {
    if (!open) return;
    setDraft(normalizeActivityRegions(value));
  }, [open, value]);

  if (!open) return null;

  const toggle = (city) => {
    setDraft((prev) => {
      const set = new Set(prev);
      if (set.has(city)) set.delete(city);
      else set.add(city);
      const next = ACTIVITY_REGIONS.filter((item) => set.has(item));
      return next.length ? next : prev;
    });
  };

  const handleDone = () => {
    const next = normalizeActivityRegions(draft);
    onChange?.(next);
    onClose?.();
  };

  return (
    <div className="settings-region-sheet-backdrop" role="presentation" onClick={onClose}>
      <div
        className="settings-region-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`${title} 선택`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-region-sheet__head">
          <strong>{title}</strong>
          <button type="button" className="settings-sheet__close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        <p className="settings-region-sheet__hint">시 단위로 여러 곳을 선택할 수 있습니다.</p>
        <div className="settings-region-sheet__list">
          {ACTIVITY_REGIONS.map((item) => (
            <button
              key={item}
              type="button"
              className={`settings-region-sheet__item${draft.includes(item) ? " is-active" : ""}`}
              onClick={() => toggle(item)}
              aria-pressed={draft.includes(item)}
            >
              <span>{item}</span>
              {draft.includes(item) ? (
                <span className="settings-region-sheet__check" aria-hidden="true">
                  ✓
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="settings-region-sheet__foot">
          <span className="settings-region-sheet__summary">{formatRegionsLabel(draft)}</span>
          <button type="button" className="settings-region-sheet__done" onClick={handleDone}>
            완료
          </button>
        </div>
      </div>
    </div>
  );
}
