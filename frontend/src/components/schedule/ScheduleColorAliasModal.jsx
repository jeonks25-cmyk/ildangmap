import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getScheduleColorOption, normalizeScheduleColorId } from "../../constants/scheduleColors";
import { useScheduleColorAliasStore } from "../../store/useScheduleColorAliasStore";

/** 색상 별칭 입력 모달 — composer form 밖(portal)에서 렌더, 실패해도 앱 중단 없음 */
export default function ScheduleColorAliasModal({ open, colorId, onClose }) {
  const setColorAlias = useScheduleColorAliasStore((s) => s.setColorAlias);
  const normalizedId = colorId ? normalizeScheduleColorId(colorId) : "";
  const savedAlias = useScheduleColorAliasStore((s) =>
    normalizedId ? String(s.aliasesByColorId?.[normalizedId] || "").trim() : ""
  );
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!open) return;
    setValue(savedAlias);
  }, [open, savedAlias, normalizedId]);

  const persistAlias = useCallback(
    (nextAlias) => {
      if (!normalizedId) return false;
      try {
        setColorAlias(normalizedId, nextAlias);
        return true;
      } catch (error) {
        console.error("[ScheduleColorAliasModal] setColorAlias failed", error);
        return false;
      }
    },
    [normalizedId, setColorAlias]
  );

  const handleSave = useCallback(() => {
    if (!persistAlias(value)) return;
    onClose?.();
  }, [onClose, persistAlias, value]);

  const handleClear = useCallback(() => {
    if (!persistAlias("")) return;
    onClose?.();
  }, [onClose, persistAlias]);

  if (!open || !colorId || !normalizedId) return null;

  const tone = getScheduleColorOption(normalizedId);

  return createPortal(
    <div className="schedule-color-alias-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="schedule-color-alias-modal"
        role="dialog"
        aria-modal="true"
        aria-label="색상 별칭"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="schedule-color-alias-modal__head">
          <span className="schedule-color-alias-modal__swatch" style={{ background: tone.bg, color: tone.text }}>
            {tone.label}
          </span>
          <h2>색상 별칭</h2>
          <p>오야지·거래처·팀 이름으로 표시할 수 있어요.</p>
        </header>

        <label className="schedule-color-alias-modal__field">
          <span>별칭</span>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`예: ${tone.label === "파랑" ? "장재열" : tone.label === "초록" ? "더본인테리어" : "김반장"}`}
            maxLength={20}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
            }}
          />
        </label>

        <p className="schedule-color-alias-modal__hint">
          비우면 기본 색상명 <strong>{tone.label}</strong>을 사용합니다.
        </p>

        <div className="schedule-color-alias-modal__actions">
          {savedAlias ? (
            <button type="button" className="schedule-color-alias-modal__ghost" onClick={handleClear}>
              별칭 삭제
            </button>
          ) : (
            <button type="button" className="schedule-color-alias-modal__ghost" onClick={onClose}>
              취소
            </button>
          )}
          <button type="button" className="schedule-color-alias-modal__primary" onClick={handleSave}>
            저장
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
