import { SCHEDULE_DEFAULT_END_TIME, SCHEDULE_DEFAULT_START_TIME } from "../constants/scheduleDefaults";

/** 일정 통합 — 공개 가능 여부 (2상태) */
export const DAY_STATUS = {
  available: "available",
  unavailable: "unavailable",
};

export function toDateKey(d) {
  const date = d instanceof Date ? d : new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function scheduleDateKeyFromWorkDate(workDate) {
  if (!workDate) return "";
  const d = new Date(workDate);
  return Number.isNaN(d.getTime()) ? "" : toDateKey(d);
}

export function monthMatrix(viewYear, viewMonth) {
  const first = new Date(viewYear, viewMonth, 1);
  const startPad = first.getDay();
  const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let day = 1; day <= lastDay; day += 1) cells.push(new Date(viewYear, viewMonth, day));
  while (cells.length % 7 !== 0) cells.push(null);
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

export function createPersonalEvent({
  title,
  dateKey,
  id,
  color = "gray",
  startTime = SCHEDULE_DEFAULT_START_TIME,
  endTime = SCHEDULE_DEFAULT_END_TIME,
  memo = "",
}) {
  const cleanTitle = String(title || "").trim();
  if (!cleanTitle || !dateKey) return null;
  return {
    id: id || `pe-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    dateKey: String(dateKey),
    title: cleanTitle,
    color: String(color || "gray"),
    startTime: String(startTime || SCHEDULE_DEFAULT_START_TIME),
    endTime: String(endTime || SCHEDULE_DEFAULT_END_TIME),
    memo: String(memo || "").trim(),
    updatedAt: new Date().toISOString(),
  };
}

/** "2026-06-03" → "6월 3일" */
export function formatMonthDay(dateKey) {
  if (!dateKey) return "";
  const [, m, d] = String(dateKey).split("-").map(Number);
  if (Number.isFinite(m) && Number.isFinite(d)) return `${m}월 ${d}일`;
  return "";
}

function dateKeyToDate(dateKey) {
  const [y, m, d] = String(dateKey).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function daysBetweenKeys(fromKey, toKey) {
  return Math.round((dateKeyToDate(toKey) - dateKeyToDate(fromKey)) / 86400000);
}

/**
 * 작업자 한 명의 "언제부터 가능한지" 전망을 날짜 단위로 계산한다.
 * 데이터는 useFieldScheduleStore(연락처 id별 시드 가용 + 개인 일정 + 현장일정)를 그대로 사용 — 새 데이터 모델 없음.
 *
 * 반환 state/라벨:
 *  - available 🟢 : 오늘 가능 → "오늘 가능" / 곧(soonDays 이내) 비면 "M월 D일부터 가능"
 *  - busy 🟡 : 오늘 일정 있음 + 한동안 차 있음 → "M월 D일까지 일정 있음"
 *  - none ⚫ : 공개된 일정이 전혀 없음 → "일정 미공유"
 *
 * @returns {{ state:'available'|'busy'|'none', dot:string, label:string, nextAvailableDateKey:(string|null) }}
 */
export function buildAvailabilityOutlook({
  availMap,
  personalEvents,
  fieldDateKeys,
  today = new Date(),
  horizonDays = 45,
  soonDays = 7,
} = {}) {
  const personalSet = new Set(
    (Array.isArray(personalEvents) ? personalEvents : []).map((e) => e && e.dateKey).filter(Boolean)
  );
  const fieldSet = fieldDateKeys instanceof Set ? fieldDateKeys : new Set();

  const dayState = (dateKey) => {
    const raw = availMap ? availMap[dateKey] : undefined;
    if (raw === DAY_STATUS.unavailable) return "busy";
    if (personalSet.has(dateKey)) return "busy";
    if (fieldSet.has(dateKey)) return "busy";
    if (raw === DAY_STATUS.available) return "free";
    return "unknown";
  };

  const base = new Date(today);
  base.setHours(0, 0, 0, 0);
  const todayKey = toDateKey(base);
  const todayState = dayState(todayKey);

  let nextFreeKey = null;
  let busyUntilKey = null;
  let anyKnown = false;
  const cursor = new Date(base);
  for (let i = 0; i < horizonDays; i += 1) {
    const key = toDateKey(cursor);
    const st = dayState(key);
    if (st !== "unknown") anyKnown = true;
    if (st === "free") {
      nextFreeKey = key;
      break;
    }
    busyUntilKey = key;
    cursor.setDate(cursor.getDate() + 1);
  }

  if (todayState === "free") {
    return { state: "available", dot: "🟢", label: "오늘 가능", nextAvailableDateKey: todayKey };
  }
  if (nextFreeKey) {
    const diff = daysBetweenKeys(todayKey, nextFreeKey);
    if (diff <= soonDays) {
      return {
        state: "available",
        dot: "🟢",
        label: `${formatMonthDay(nextFreeKey)}부터 가능`,
        nextAvailableDateKey: nextFreeKey,
      };
    }
    return {
      state: "busy",
      dot: "🟡",
      label: `${formatMonthDay(busyUntilKey)}까지 일정 있음`,
      nextAvailableDateKey: nextFreeKey,
    };
  }
  if (anyKnown) {
    return { state: "busy", dot: "🟡", label: "일정 있음", nextAvailableDateKey: null };
  }
  return { state: "none", dot: "⚫", label: "일정 미공유", nextAvailableDateKey: null };
}

/** UI 노출용 — none(미공유) 상태는 화면에 표시하지 않음 */
export function isOutlookVisibleInUi(outlook) {
  if (!outlook) return false;
  return outlook.state === "available" || outlook.state === "busy";
}
