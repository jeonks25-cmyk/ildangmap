import React, { useEffect, useState } from "react";
import { ACTIVITY_REGIONS, formatRegionsLabel, normalizeActivityRegions } from "../../constants/activityRegions";

/**
 * 활동지역 복수 선택 바텀시트
 */
export default function ActivityRegionsSheet({ open, value = [], onClose, onChange }) {
  const [draft, setDraft] = useState([]);

  useEffect(() => {
    if (!open) return;
    setDraft(normalizeActivityRegions(value));
  }, [open, value]);

  if (!open) return null;

  const toggle = (item) => {
    setDraft((prev) => {
      const set = new Set(prev);
      if (set.has(item)) set.delete(item);
      else set.add(item);
      return ACTIVITY_REGIONS.filter((r) => set.has(r));
    });
  };

  const handleConfirm = () => {
    const next = normalizeActivityRegions(draft);
    onChange?.(next);
    onClose?.();
  };

  const handleDismiss = () => {
    const next = normalizeActivityRegions(draft);
    const prev = normalizeActivityRegions(value);
    if (next.join("\u0000") !== prev.join("\u0000")) {
      onChange?.(next);
    }
    onClose?.();
  };

  return (
    <div className="settings-region-sheet-backdrop" role="presentation" onClick={handleDismiss}>
      <div
        className="settings-region-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="활동지역 선택"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-region-sheet__head">
          <div>
            <strong>활동지역</strong>
            <p className="settings-region-sheet__sub">
              {draft.length ? formatRegionsLabel(draft) : "시 단위 · 복수 선택"}
            </p>
          </div>
          <button type="button" className="settings-sheet__close" onClick={handleDismiss} aria-label="닫기">
            ×
          </button>
        </div>
        <div className="settings-region-sheet__list">
          {ACTIVITY_REGIONS.map((item) => (
            <button
              key={item}
              type="button"
              className={`settings-region-sheet__item${draft.includes(item) ? " is-active" : ""}`}
              onClick={() => toggle(item)}
              aria-pressed={draft.includes(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <button type="button" className="settings-region-sheet__confirm" onClick={handleConfirm}>
          완료
        </button>
      </div>
    </div>
  );
}
