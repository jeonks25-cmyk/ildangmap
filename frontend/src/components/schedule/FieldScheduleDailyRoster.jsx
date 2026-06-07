import React from "react";
import { buildDailyWorkerRoster, formatSchedulePeriodLabel } from "../../utils/workerAssignmentModel";

/**
 * 현장 일정 탭 — 기간 + 날짜별 인원 배정 현황
 */
export default function FieldScheduleDailyRoster({ schedule, assignments }) {
  if (!schedule) return null;

  const periodLabel = formatSchedulePeriodLabel(schedule);
  const days = buildDailyWorkerRoster(schedule, assignments);

  return (
    <section className="field-schedule-roster app-card" aria-label="현장 일정·인원 배정">
      <h2 className="field-schedule-roster__title">일정</h2>

      <div className="field-schedule-roster__period">
        <span className="field-schedule-roster__period-label">기간</span>
        <strong className="field-schedule-roster__period-value">{periodLabel}</strong>
        {schedule.workTime ? (
          <span className="field-schedule-roster__time">{schedule.workTime}</span>
        ) : null}
      </div>

      <div className="field-schedule-roster__team-head">
        <h3>팀원</h3>
        <span className="field-schedule-roster__team-hint">날짜별 배정</span>
      </div>

      <ul className="field-schedule-roster__days">
        {days.map((day) => (
          <li key={day.dateKey} className="field-schedule-roster__day">
            <div className="field-schedule-roster__day-label">{day.dateLabel}</div>
            {day.workers.length ? (
              <ul className="field-schedule-roster__workers">
                {day.workers.map((w) => (
                  <li key={`${day.dateKey}-${w.userId}`} className="field-schedule-roster__worker">
                    <span className="field-schedule-roster__worker-name">{w.name}</span>
                    {w.role === "owner" ? (
                      <span className="field-schedule-roster__worker-role">소장</span>
                    ) : w.periodLabel && w.periodLabel !== day.dateLabel.replace(/ \(\S\)$/, "") ? (
                      <span className="field-schedule-roster__worker-period">{w.periodLabel}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="field-schedule-roster__empty-day">배정 없음</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
