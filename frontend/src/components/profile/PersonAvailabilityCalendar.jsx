import React, { useEffect, useMemo, useState } from "react";
import { useFieldScheduleStore } from "../../store/useFieldScheduleStore";
import { useSettlementStore } from "../../store/useSettlementStore";
import { DAY_STATUS, monthMatrix, toDateKey } from "../../utils/fieldScheduleModel";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export const DAY_DEPLOY_STATUS = {
  available: "available",
  busy: "busy",
  none: "none",
};

/** 날짜별 상태 — 점 없음(가능) / 채운 점(일정) / 빈 원(미공유) */
export function resolvePersonDayDeployStatus({
  dateKey,
  availMap,
  personalEvents,
  fieldDateKeys,
}) {
  const raw = availMap?.[dateKey];
  if (raw === DAY_STATUS.unavailable) return DAY_DEPLOY_STATUS.busy;
  if (Array.isArray(personalEvents) && personalEvents.some((e) => e.dateKey === dateKey)) {
    return DAY_DEPLOY_STATUS.busy;
  }
  if (fieldDateKeys instanceof Set && fieldDateKeys.has(dateKey)) return DAY_DEPLOY_STATUS.busy;
  if (raw === DAY_STATUS.available) return DAY_DEPLOY_STATUS.available;
  return DAY_DEPLOY_STATUS.none;
}

/** 오늘 투입 가능 여부 */
export function isPersonAvailableToday({ availMap, personalEvents, fieldDateKeys, today = new Date() }) {
  return (
    resolvePersonDayDeployStatus({
      dateKey: toDateKey(today),
      availMap,
      personalEvents,
      fieldDateKeys,
    }) === DAY_DEPLOY_STATUS.available
  );
}

/** 가능=표시 없음, 일정=●, 미공유=○ */
function AvailabilityDayMarker({ status }) {
  if (status === DAY_DEPLOY_STATUS.busy) {
    return <span className="person-avail-cal__marker person-avail-cal__marker--busy" aria-hidden="true" />;
  }
  if (status === DAY_DEPLOY_STATUS.none) {
    return <span className="person-avail-cal__marker person-avail-cal__marker--none" aria-hidden="true" />;
  }
  return <span className="person-avail-cal__marker person-avail-cal__marker--free" aria-hidden="true" />;
}

/**
 * 작업자 월간 가용 캘린더 — 점·원만으로 상태 표시 (읽기 전용).
 */
export default function PersonAvailabilityCalendar({ ownerId, personName = "" }) {
  const ensureSeeded = useFieldScheduleStore((s) => s.ensureSeeded);
  const seeded = useFieldScheduleStore((s) => s.seeded);
  const availMap = useFieldScheduleStore((s) => s.availabilityByOwner[ownerId]);
  const personalEvents = useFieldScheduleStore((s) => s.personalEventsByOwner[ownerId]);
  const revision = useFieldScheduleStore((s) => s.revisionsByOwner[ownerId]);
  const schedules = useSettlementStore((s) => s.schedules);

  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useEffect(() => {
    ensureSeeded();
  }, [ensureSeeded, seeded]);

  const rows = useMemo(() => monthMatrix(viewYear, viewMonth), [viewYear, viewMonth]);
  const todayKey = toDateKey(today);

  const fieldDateKeys = useMemo(
    () => useFieldScheduleStore.getState().getFieldDateKeysForOwner(ownerId, schedules),
    [ownerId, schedules]
  );

  const statusFor = (dateKey) =>
    resolvePersonDayDeployStatus({ dateKey, availMap, personalEvents, fieldDateKeys });

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

  return (
    <section
      className="person-avail-cal"
      aria-label={`${personName || "작업자"} 투입 가능 달력`}
      data-sched-rev={revision ?? 0}
    >
      <div className="person-avail-cal__nav">
        <button type="button" className="person-avail-cal__nav-btn" onClick={prevMonth} aria-label="이전 달">
          ‹
        </button>
        <h3 className="person-avail-cal__title">
          {viewYear}년 {viewMonth + 1}월
        </h3>
        <button type="button" className="person-avail-cal__nav-btn" onClick={nextMonth} aria-label="다음 달">
          ›
        </button>
      </div>

      <div className="person-avail-cal__weekdays" aria-hidden="true">
        {WEEKDAYS.map((w) => (
          <span key={w} className="person-avail-cal__weekday">
            {w}
          </span>
        ))}
      </div>

      <div className="person-avail-cal__grid">
        {rows.map((week, wi) => (
          <div key={wi} className="person-avail-cal__row">
            {week.map((date, di) => {
              if (!date) {
                return <span key={`e-${wi}-${di}`} className="person-avail-cal__cell person-avail-cal__cell--empty" />;
              }
              const dateKey = toDateKey(date);
              const status = statusFor(dateKey);
              const isToday = dateKey === todayKey;
              const statusLabel =
                status === DAY_DEPLOY_STATUS.available
                  ? "가능"
                  : status === DAY_DEPLOY_STATUS.busy
                    ? "일정 있음"
                    : "미공유";
              return (
                <div
                  key={dateKey}
                  className={`person-avail-cal__cell${isToday ? " is-today" : ""}`}
                  aria-label={`${date.getMonth() + 1}월 ${date.getDate()}일 ${statusLabel}`}
                >
                  <span className="person-avail-cal__day">{date.getDate()}</span>
                  <AvailabilityDayMarker status={status} />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
