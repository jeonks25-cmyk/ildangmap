/**
 * 그룹 일정 보드 집계.
 * 데이터는 useFieldScheduleStore(연락처 id별 가용 2상태 + 개인 일정)를 그대로 읽는다 — 새 일정 모델 없음.
 * 실제 저장된 데이터만 표시한다(3분류):
 *  - available 🟢 가능
 *  - busy      🔴 일정 있음
 *  - none      ⚫ 미공유
 */
import { DAY_STATUS, monthMatrix, toDateKey } from "./fieldScheduleModel";
import { buildCoworkCountByContactId } from "./coworkHistoryModel";

export const BOARD_STATUS = {
  available: "available",
  busy: "busy",
  none: "none",
};

function personalSetFor(personalEvents) {
  return new Set(
    (Array.isArray(personalEvents) ? personalEvents : []).map((e) => e && e.dateKey).filter(Boolean)
  );
}

/** 멤버 한 명의 특정 날짜 상태 분류 (실데이터 기반) */
export function classifyMemberDay(availMap, personalSet, ownerId, dateKey) {
  const raw = availMap ? availMap[dateKey] : undefined;
  if (raw === DAY_STATUS.unavailable) return BOARD_STATUS.busy;
  if (personalSet && personalSet.has(dateKey)) return BOARD_STATUS.busy;
  if (raw === DAY_STATUS.available) return BOARD_STATUS.available;
  return BOARD_STATUS.none;
}

function emptyAggregate() {
  return { available: 0, busy: 0, none: 0 };
}

function dateKeyToDate(dateKey) {
  const [y, m, d] = String(dateKey).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/**
 * 선택 날짜(startDateKey)부터 멤버가 "가능"인 날이 며칠 연속되는지 센다.
 * 실데이터(availabilityByOwner + personalEvents)만 사용 — 가능이 끊기면 종료.
 * @returns {number} 연속 가능일(최소 0)
 */
export function countConsecutiveAvailable({ availMap, personalSet, ownerId, startDateKey, maxDays = 60 }) {
  if (!startDateKey) return 0;
  const cursor = dateKeyToDate(startDateKey);
  let streak = 0;
  for (let i = 0; i < maxDays; i += 1) {
    const key = toDateKey(cursor);
    if (classifyMemberDay(availMap, personalSet, ownerId, key) !== BOARD_STATUS.available) break;
    streak += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return streak;
}

/**
 * 그룹 멤버 전체에 대해 한 달치 날짜별 집계를 만든다.
 * @returns {{ rows:(Date|null)[][], byDateKey:Record<string,{available:number,busy:number,none:number}> }}
 */
export function buildGroupMonthBoard({
  members,
  availabilityByOwner = {},
  personalEventsByOwner = {},
  viewYear,
  viewMonth,
}) {
  const rows = monthMatrix(viewYear, viewMonth);
  const mem = Array.isArray(members) ? members : [];
  const personalSetByOwner = {};
  mem.forEach((c) => {
    const ownerId = String(c.id);
    personalSetByOwner[ownerId] = personalSetFor(personalEventsByOwner[ownerId]);
  });

  const byDateKey = {};
  rows.forEach((week) => {
    week.forEach((d) => {
      if (!d) return;
      const dateKey = toDateKey(d);
      const agg = emptyAggregate();
      mem.forEach((c) => {
        const ownerId = String(c.id);
        const st = classifyMemberDay(availabilityByOwner[ownerId], personalSetByOwner[ownerId], ownerId, dateKey);
        agg[st] += 1;
      });
      byDateKey[dateKey] = agg;
    });
  });

  return { rows, byDateKey };
}

/**
 * 선택한 날짜의 멤버를 상태별로 묶는다.
 * 가능(available) 멤버에는 연속 가능일(consecutiveDays)과 협업 횟수(coworkCount)를 붙이고,
 * 1순위 연속 가능일 ↓, 2순위 협업 횟수 ↓, 3순위 이름 순으로 정렬한다.
 * @returns {{ available:object[], busy:object[], none:object[] }}
 */
export function buildGroupDayDetail({
  members,
  availabilityByOwner = {},
  personalEventsByOwner = {},
  dateKey,
  coworkHistory = [],
}) {
  const out = { available: [], busy: [], none: [] };
  if (!dateKey) return out;
  const coworkCountById = buildCoworkCountByContactId(coworkHistory);
  (Array.isArray(members) ? members : []).forEach((c) => {
    if (!c) return;
    const ownerId = String(c.id);
    const personalSet = personalSetFor(personalEventsByOwner[ownerId]);
    const st = classifyMemberDay(availabilityByOwner[ownerId], personalSet, ownerId, dateKey);
    if (st === BOARD_STATUS.available) {
      const consecutiveDays = countConsecutiveAvailable({
        availMap: availabilityByOwner[ownerId],
        personalSet,
        ownerId,
        startDateKey: dateKey,
      });
      const coworkCount = coworkCountById[ownerId] || 0;
      out.available.push({ ...c, consecutiveDays, coworkCount });
    } else {
      out[st].push(c);
    }
  });
  out.available.sort((a, b) => {
    const streakDiff = (b.consecutiveDays || 0) - (a.consecutiveDays || 0);
    if (streakDiff !== 0) return streakDiff;
    const coworkDiff = (b.coworkCount || 0) - (a.coworkCount || 0);
    if (coworkDiff !== 0) return coworkDiff;
    return String(a.name || "").localeCompare(String(b.name || ""), "ko");
  });
  return out;
}
