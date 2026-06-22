import React, { useEffect, useState } from "react";
import { getScheduleColorOption } from "../../constants/scheduleColors";
import { useScheduleColorAliasStore } from "../../store/useScheduleColorAliasStore";

/** 색상 별칭 입력 모달 — 오야지/거래처/팀 이름 */
export default function ScheduleColorAliasModal({ open, colorId, onClose }) {
  const setColorAlias = useScheduleColorAliasStore((s) => s.setColorAlias);
  const savedAlias = useScheduleColorAliasStore((s) => s.getColorAlias(colorId));
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!open) return;
    setValue(savedAlias);
  }, [open, savedAlias, colorId]);

  if (!open || !colorId) return null;

  const tone = getScheduleColorOption(colorId);

  const handleSave = (e) => {
    e.preventDefault();
    setColorAlias(colorId, value);
    onClose?.();
  };

  const handleClear = () => {
    setColorAlias(colorId, "");
    onClose?.();
  };

  return (
    <div className="schedule-color-alias-modal-backdrop" role="presentation" onClick={onClose}>
      <form
        className="schedule-color-alias-modal"
        role="dialog"
        aria-modal="true"
        aria-label="색상 별칭"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSave}
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
          <button type="submit" className="schedule-color-alias-modal__primary">
            저장
          </button>
        </div>
      </form>
    </div>
  );
}
