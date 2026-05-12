import React, { useEffect, useMemo, useState } from "react";

function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateKey(key) {
  const [y, m, d] = String(key).split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return Number.isNaN(dt.getTime()) ? new Date() : dt;
}

function monthMatrix(viewYear, viewMonth) {
  const first = new Date(viewYear, viewMonth, 1);
  const startPad = first.getDay();
  const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let day = 1; day <= lastDay; day += 1) {
    cells.push(new Date(viewYear, viewMonth, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

export default function MiniCalendarModal({ open, onClose, selectedDateKey, onSelectDate }) {
  const initial = useMemo(() => parseDateKey(selectedDateKey), [selectedDateKey]);
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  useEffect(() => {
    if (!open) return;
    const d = parseDateKey(selectedDateKey);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [open, selectedDateKey]);

  if (!open) return null;

  const rows = monthMatrix(viewYear, viewMonth);
  const todayKey = toDateKey(new Date());

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const title = `${viewYear}년 ${viewMonth + 1}월`;

  return (
    <div className="map-mini-cal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="map-mini-cal-modal"
        role="dialog"
        aria-modal="true"
        aria-label="날짜 선택"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="map-mini-cal-modal__head">
          <button type="button" className="map-mini-cal-nav" onClick={prevMonth} aria-label="이전 달">
            ‹
          </button>
          <div className="map-mini-cal-modal__title">{title}</div>
          <button type="button" className="map-mini-cal-nav" onClick={nextMonth} aria-label="다음 달">
            ›
          </button>
        </div>
        <div className="map-mini-cal-weekdays" aria-hidden="true">
          {["일", "월", "화", "수", "목", "금", "토"].map((w) => (
            <span key={w} className="map-mini-cal-weekday">
              {w}
            </span>
          ))}
        </div>
        <div className="map-mini-cal-grid">
          {rows.map((row, ri) => (
            <div key={ri} className="map-mini-cal-row">
              {row.map((cell, ci) => {
                if (!cell) return <div key={`e-${ri}-${ci}`} className="map-mini-cal-cell map-mini-cal-cell--empty" />;
                const key = toDateKey(cell);
                const isToday = key === todayKey;
                const isSelected = key === selectedDateKey;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`map-mini-cal-cell${isSelected ? " is-selected" : ""}${isToday ? " is-today" : ""}`}
                    onClick={() => {
                      onSelectDate?.(key);
                      onClose?.();
                    }}
                  >
                    {cell.getDate()}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <button type="button" className="map-mini-cal-close" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
