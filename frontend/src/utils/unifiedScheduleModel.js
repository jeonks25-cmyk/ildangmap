/**
 * 일정 탭 통합 모델 (MVP)
 *
 * - `mapped`: 일당맵 연결 일정 — 함께 표시되며 일정 변경 시 알림으로 가능/불가만 응답.
 * - `personal`: 개인 일정 — 자유 등록·수정·삭제.
 *
 * availability 는 캘린더/외부 공개용 2상태(`available` | `blocked`)만 사용합니다.
 */

import { scheduleDateKeyFromWorkDate } from "./fieldScheduleModel";

export const SCHEDULE_ENTRY_TYPE = {
  MAPPED: "mapped",
  PERSONAL: "personal",
};

/**
 * @param {import('./fieldScheduleModel').PersonalEvent} ev
 */
export function toUnifiedPersonal(ev) {
  if (!ev) return null;
  return {
    id: ev.id,
    type: SCHEDULE_ENTRY_TYPE.PERSONAL,
    title: ev.title,
    date: ev.dateKey,
    availability: "blocked",
    editable: true,
    createdBy: "me",
  };
}

/** @param {object} schedule settlement store row */
export function toUnifiedMapped(schedule) {
  if (!schedule) return null;
  const dateKey = scheduleDateKeyFromWorkDate(schedule.workDate);
  return {
    id: String(schedule.id),
    type: SCHEDULE_ENTRY_TYPE.MAPPED,
    title: schedule.title || "현장",
    date: dateKey,
    availability: "blocked",
    editable: false,
    createdBy: "ildangmap",
    sourceSchedule: schedule,
  };
}
