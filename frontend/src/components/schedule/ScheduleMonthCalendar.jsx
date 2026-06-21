import React, { useEffect, useMemo, useState } from "react";
import {
  getMyScheduleOwnerId,
  selectPersonalEventsForOwner,
  useFieldScheduleStore,
} from "../../store/useFieldScheduleStore";
import { monthMatrix, toDateKey } from "../../utils/fieldScheduleModel";
import { useSettlementStore } from "../../store/useSettlementStore";
import { todayDateKey } from "../../utils/calendarEventModel";
import { buildCalendarCellLabels } from "../../utils/scheduleDayEntries";
import { getScheduleColorOption } from "../../constants/scheduleColors";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 월간 캘린더 — 날짜칸에 대표 현장명 + 추가 건수 */
export default function ScheduleMonthCalendar({
  selectedDateKey,
  onSelectDate,
  onSelectEntry,
  selectDateOnGoToday = true,
}) {
  const ownerId = getMyScheduleOwnerId();
  const schedules = useSettlementStore((s) => s.schedules);
  const ensureSeeded = useFieldScheduleStore((s) => s.ensureSeeded);
  const personalEvents = useFieldScheduleStore((s) => selectPersonalEventsForOwner(s, ownerId));
  const revision = useFieldScheduleStore((s) => s.revisionsByOwner[ownerId]);

  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useEffect(() => {
    ensureSeeded();
  }, [ensureSeeded]);

  useEffect(() => {
    void revision;
  }, [revision]);

  const rows = useMemo(() => monthMatrix(viewYear, viewMonth), [viewYear, viewMonth]);
  const todayKey = todayDateKey();

  useEffect(() => {
    if (!selectedDateKey) return;
    const [y, m] = String(selectedDateKey).split("-").map(Number);
    if (Number.isFinite(y) && Number.isFinite(m)) {
      setViewYear(y);
      setViewMonth(m - 1);
    }
  }, [selectedDateKey]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
  };

  const goToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    if (selectDateOnGoToday) onSelectDate?.(toDateKey(now));
  };

  return (
    <section className="schedule-month-cal schedule-month-cal--oyaji" aria-label="월간 일정">
      <header className="schedule-month-cal__nav schedule-month-cal__nav--oyaji">
        <h2 className="schedule-month-cal__title schedule-month-cal__title--oyaji">
          {viewYear}년 {viewMonth + 1}월
        </h2>
        <div className="schedule-month-cal__nav-actions">
          <button type="button" className="schedule-month-cal__nav-btn" onClick={prevMonth} aria-label="이전 달">
            ‹
          </button>
          <button type="button" className="schedule-month-cal__today" onClick={goToday}>
            오늘
          </button>
          <button type="button" className="schedule-month-cal__nav-btn" onClick={nextMonth} aria-label="다음 달">
            ›
          </button>
        </div>
      </header>

      <div className="schedule-month-cal__weekdays" aria-hidden="true">
        {WEEKDAYS.map((w, i) => (
          <span
            key={w}
            className={`schedule-month-cal__weekday${i === 0 ? " schedule-month-cal__weekday--sun" : ""}${i === 6 ? " schedule-month-cal__weekday--sat" : ""}`}
          >
            {w}
          </span>
        ))}
      </div>

      <div className="schedule-month-cal__body schedule-month-cal__body--oyaji">
        {rows.map((week, wi) => (
          <div key={wi} className="schedule-month-cal__week schedule-month-cal__week--oyaji">
            {week.map((date, col) => {
              if (!date) {
                return <div key={`e-${wi}-${col}`} className="schedule-month-cal__cell schedule-month-cal__cell--empty" />;
              }
              const dateKey = toDateKey(date);
              const isSelected = dateKey === selectedDateKey;
              const isToday = dateKey === todayKey;
              const isSunday = date.getDay() === 0;
              const isSaturday = date.getDay() === 6;
              const { visible, extra } = buildCalendarCellLabels({
                schedules,
                personalEvents,
                dateKey,
                maxVisible: 2,
              });
              const labelSummary = visible.map((v) => v.shortTitle).join(", ");

              return (
                <button
                  key={dateKey}
                  type="button"
                  className={`schedule-month-cal__cell schedule-month-cal__cell--oyaji${isToday ? " is-today" : ""}${isSelected ? " is-selected" : ""}${isSunday ? " is-sun" : ""}${isSaturday ? " is-sat" : ""}`}
                  onClick={() => onSelectDate?.(dateKey)}
                  aria-label={
                    visible.length
                      ? `${date.getMonth() + 1}월 ${date.getDate()}일, ${labelSummary}${extra > 0 ? ` 외 ${extra}건` : ""}`
                      : `${date.getMonth() + 1}월 ${date.getDate()}일`
                  }
                  aria-pressed={isSelected}
                >
                  <span className="schedule-month-cal__day">{date.getDate()}</span>
                  <div className="schedule-month-cal__cell-sites">
                    {visible.map((item) => {
                      const tone = getScheduleColorOption(item.colorId);
                      return (
                        <span
                          key={item.id}
                          role="button"
                          tabIndex={0}
                          className="schedule-month-cal__site-label schedule-month-cal__site-label--clickable"
                          style={{ background: tone.bg, color: tone.text }}
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelectEntry?.(item.id, dateKey);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              event.stopPropagation();
                              onSelectEntry?.(item.id, dateKey);
                            }
                          }}
                        >
                          {item.shortTitle}
                        </span>
                      );
                    })}
                    {extra > 0 ? <span className="schedule-month-cal__more-count">+{extra}</span> : null}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
