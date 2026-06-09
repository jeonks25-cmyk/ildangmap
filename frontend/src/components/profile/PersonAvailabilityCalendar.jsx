import React, { useEffect, useMemo, useState } from "react";
import { useFieldScheduleStore } from "../../store/useFieldScheduleStore";
import { useSettlementStore } from "../../store/useSettlementStore";
import { DAY_STATUS, monthMatrix, toDateKey } from "../../utils/fieldScheduleModel";
import {
  DAY_DEPLOY_STATUS,
  getMyInvitedFieldDateKeysForContact,
  personDayDeployStatusLabel,
  resolvePersonDayDeployStatus,
} from "../../utils/personCalendarModel";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const LEGEND_ITEMS = [
  { status: DAY_DEPLOY_STATUS.available, label: "가능", className: "person-avail-cal__marker--available" },
  { status: DAY_DEPLOY_STATUS.busy, label: "일정 있음", className: "person-avail-cal__marker--busy" },
  { status: DAY_DEPLOY_STATUS.invited, label: "내 현장", className: "person-avail-cal__marker--invited" },
];

function AvailabilityDayMarker({ status }) {
  if (status === DAY_DEPLOY_STATUS.invited) {
    return <span className="person-avail-cal__marker person-avail-cal__marker--invited" aria-hidden="true" />;
  }
  if (status === DAY_DEPLOY_STATUS.busy) {
    return <span className="person-avail-cal__marker person-avail-cal__marker--busy" aria-hidden="true" />;
  }
  return <span className="person-avail-cal__marker person-avail-cal__marker--available" aria-hidden="true" />;
}

/** 오늘 투입 가능 여부 */
export function isPersonAvailableToday({
  availMap,
  personalEvents,
  fieldDateKeys,
  myFieldDateKeys,
  today = new Date(),
}) {
  return (
    resolvePersonDayDeployStatus({
      dateKey: toDateKey(today),
      availMap,
      personalEvents,
      fieldDateKeys,
      myFieldDateKeys,
      dayStatusUnavailable: DAY_STATUS.unavailable,
    }) === DAY_DEPLOY_STATUS.available
  );
}

/**
 * 작업자 월간 가용 캘린더 — ○ 가능 / ● 일정 / ◎ 내 현장 (읽기 전용).
 */
export default function PersonAvailabilityCalendar({
  ownerId,
  personName = "",
  viewerUserId = null,
  contactUserId = null,
}) {
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
    [ownerId, schedules],
  );

  const myFieldDateKeys = useMemo(
    () =>
      getMyInvitedFieldDateKeysForContact({
        viewerUserId,
        contactUserId,
        schedules,
      }),
    [viewerUserId, contactUserId, schedules],
  );

  const statusFor = (dateKey) =>
    resolvePersonDayDeployStatus({
      dateKey,
      availMap,
      personalEvents,
      fieldDateKeys,
      myFieldDateKeys,
      dayStatusUnavailable: DAY_STATUS.unavailable,
    });

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
              const statusLabel = personDayDeployStatusLabel(status);
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

      <div className="person-avail-cal__legend" aria-label="캘린더 범례">
        {LEGEND_ITEMS.map((item) => (
          <span key={item.status} className="person-avail-cal__legend-item">
            <span className={`person-avail-cal__marker ${item.className}`} aria-hidden="true" />
            <span className="person-avail-cal__legend-label">{item.label}</span>
          </span>
        ))}
      </div>
    </section>
  );
}

export { DAY_DEPLOY_STATUS, resolvePersonDayDeployStatus };
