import React, { useCallback, useRef, useState } from "react";
import { SCHEDULE_COLOR_OPTIONS } from "../../constants/scheduleColors";
import { useScheduleColorAliasStore } from "../../store/useScheduleColorAliasStore";
import ScheduleColorAliasModal from "./ScheduleColorAliasModal";

const LONG_PRESS_MS = 500;

/**
 * 일정 색상 선택 — 탭 선택 · 길게 누르기/편집 버튼으로 별칭 설정
 */
export default function ScheduleColorPicker({ value, onChange, className = "" }) {
  const aliasesByColorId = useScheduleColorAliasStore((s) => s.aliasesByColorId);
  const [aliasModalColorId, setAliasModalColorId] = useState(null);
  const longPressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);

  const openAliasModal = useCallback((colorId) => {
    setAliasModalColorId(colorId);
  }, []);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const startLongPress = useCallback(
    (colorId) => {
      clearLongPress();
      longPressTriggeredRef.current = false;
      longPressTimerRef.current = setTimeout(() => {
        longPressTriggeredRef.current = true;
        openAliasModal(colorId);
      }, LONG_PRESS_MS);
    },
    [clearLongPress, openAliasModal]
  );

  const handleSelect = useCallback(
    (colorId) => {
      if (longPressTriggeredRef.current) {
        longPressTriggeredRef.current = false;
        return;
      }
      onChange?.(colorId);
    },
    [onChange]
  );

  return (
    <>
      <fieldset className={`schedule-entry-composer__colors${className ? ` ${className}` : ""}`}>
        <legend>
          색상
          <span className="schedule-color-picker__legend-hint">길게 눌러 별칭 설정</span>
        </legend>
        <div className="schedule-entry-composer__color-grid">
          {SCHEDULE_COLOR_OPTIONS.map((opt) => {
            const displayLabel =
              String(aliasesByColorId?.[opt.id] || "").trim() || opt.label;
            return (
              <div key={opt.id} className="schedule-color-picker__cell">
                <button
                  type="button"
                  className={`schedule-entry-composer__color-btn schedule-color-picker__btn${value === opt.id ? " is-selected" : ""}`}
                  style={{ background: opt.bg, color: opt.text }}
                  aria-label={`${displayLabel} 색상`}
                  aria-pressed={value === opt.id}
                  onClick={() => handleSelect(opt.id)}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    startLongPress(opt.id);
                  }}
                  onPointerUp={clearLongPress}
                  onPointerLeave={clearLongPress}
                  onPointerCancel={clearLongPress}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    openAliasModal(opt.id);
                  }}
                >
                  {displayLabel}
                </button>
                <button
                  type="button"
                  className="schedule-color-picker__edit"
                  aria-label={`${displayLabel} 별칭 편집`}
                  onClick={() => openAliasModal(opt.id)}
                >
                  ✎
                </button>
              </div>
            );
          })}
        </div>
      </fieldset>

      <ScheduleColorAliasModal
        open={Boolean(aliasModalColorId)}
        colorId={aliasModalColorId}
        onClose={() => setAliasModalColorId(null)}
      />
    </>
  );
}
