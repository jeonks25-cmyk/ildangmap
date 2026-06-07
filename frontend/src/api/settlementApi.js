import { isMockApiEnabled, runApiRequest } from "./client";
import {
  loadStoredSchedules,
  migrateSchedule,
  SCHEDULE_SETTLEMENT_STATUS,
} from "../utils/scheduleModel";

function getMonthSchedules(scheduleList, baseDate) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  return (Array.isArray(scheduleList) ? scheduleList : []).filter((schedule) => {
    if (!schedule?.workDate) return false;
    const date = new Date(schedule.workDate);
    return !Number.isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month;
  });
}

function buildSettlementSummary(scheduleList, today = new Date()) {
  const currentMonthSchedules = getMonthSchedules(scheduleList, today);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let monthExpected = 0;
  let settledAmount = 0;
  let unpaidAmount = 0;
  let scheduledAmount = 0;

  currentMonthSchedules.forEach((schedule) => {
    const amount = Number(schedule?.settlementAmount || 0);
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    const workDate = new Date(schedule?.workDate);
    monthExpected += safeAmount;
    if (schedule?.settlementStatus === SCHEDULE_SETTLEMENT_STATUS.SETTLED) {
      settledAmount += safeAmount;
      return;
    }
    if (!Number.isNaN(workDate.getTime()) && workDate >= todayStart && schedule?.settlementStatus !== SCHEDULE_SETTLEMENT_STATUS.REVIEW) {
      scheduledAmount += safeAmount;
      return;
    }
    unpaidAmount += safeAmount;
  });

  return {
    monthExpected,
    settledAmount,
    unpaidAmount,
    scheduledAmount,
  };
}

export async function getSchedules() {
  return runApiRequest({
    path: "/settlements/schedules",
    useMock: isMockApiEnabled(),
    mock: () => loadStoredSchedules().map((schedule) => migrateSchedule(schedule)),
  });
}

export async function getSettlementSummary(schedules) {
  return runApiRequest({
    path: "/settlements/summary",
    useMock: isMockApiEnabled(),
    mock: () => {
      const source = Array.isArray(schedules) ? schedules : loadStoredSchedules();
      return buildSettlementSummary(source.map((schedule) => migrateSchedule(schedule)));
    },
  });
}
