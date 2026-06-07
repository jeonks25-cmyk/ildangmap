import { DAY_STATUS } from "./fieldScheduleModel";
import { toDateKey } from "./fieldScheduleModel";
import { useFieldScheduleStore } from "../store/useFieldScheduleStore";
import { enrichContactTeam, pickFrequentTeamContacts, pickRecentTeamContacts } from "./teamNetworkModel";

export const ROSTER_AVAILABILITY = {
  available: { key: "available", label: "가능", tone: "ok" },
  morning: { key: "morning", label: "오전만 가능", tone: "partial" },
  afternoon: { key: "afternoon", label: "오후만 가능", tone: "partial" },
  busy: { key: "busy", label: "이미 일정 있음", tone: "busy" },
};

function parseDateKey(key) {
  const [y, m, d] = String(key || "").split("-").map(Number);
  const dt = new Date(y || 2026, (m || 1) - 1, d || 1);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function listDateKeysBetween(startKey, endKey) {
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey || startKey);
  if (!start || !end) return startKey ? [startKey] : [];
  const keys = [];
  const cursor = new Date(start);
  const endUtc = end.getTime();
  while (cursor.getTime() <= endUtc) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys.length ? keys : [startKey];
}

export function formatShortDateLabel(dateKey) {
  const m = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return dateKey || "";
  return `${Number(m[2])}/${Number(m[3])}`;
}

export function formatDateRangeLabel(startKey, endKey) {
  const a = formatShortDateLabel(startKey);
  const b = formatShortDateLabel(endKey);
  if (!a) return "";
  if (!b || a === b) return a;
  return `${a} ~ ${b}`;
}

function contactSeed(id) {
  let h = 0;
  const s = String(id || "");
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function contactRoleLabel(contact) {
  const years = Number(contact?.experienceYears);
  if (Number.isFinite(years) && years >= 12) return "기공";
  if (Number.isFinite(years) && years >= 6) return "준기공";
  return "조공";
}

export function contactDistanceLabel(contact, regionLabel = "") {
  const c = enrichContactTeam(contact, regionLabel);
  if (c.regionMatch) return "근처";
  const seed = contactSeed(contact?.id);
  const km = 1 + (seed % 8);
  return `${km}km`;
}

export function contactRecentWorkLabel(contact) {
  if (!contact?.hasCoworkHistory) return "—";
  const seed = contactSeed(contact?.id);
  const daysAgo = 1 + (seed % 14);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return `최근 ${formatShortDateLabel(toDateKey(date))}`;
}

/**
 * @returns {{ key: string, label: string, tone: string, cardLine: string }}
 */
export function resolveContactAvailabilityForRange(contact, workDateStart, workDateEnd, schedules = []) {
  useFieldScheduleStore.getState().ensureSeeded();
  const ownerId = contact?.scheduleOwnerId || contact?.id;
  const dateKeys = listDateKeysBetween(workDateStart, workDateEnd);
  const primaryKey = workDateStart || dateKeys[0];
  const fieldKeys = useFieldScheduleStore.getState().getFieldDateKeysForOwner("me", schedules);
  const getStatus = useFieldScheduleStore.getState().getPublicDayStatus;

  let busyDays = 0;
  for (const key of dateKeys) {
    if (getStatus(ownerId, key, fieldKeys) === DAY_STATUS.unavailable) busyDays += 1;
  }

  const shortDate = formatShortDateLabel(primaryKey);
  const enriched = enrichContactTeam(contact);

  if (busyDays > 0) {
    return {
      ...ROSTER_AVAILABILITY.busy,
      cardLine: `${shortDate} 일정 있음`,
    };
  }

  if (enriched.periodSlot === "morning") {
    return {
      ...ROSTER_AVAILABILITY.morning,
      cardLine: `${shortDate} 오전 가능`,
    };
  }
  if (enriched.periodSlot === "afternoon") {
    return {
      ...ROSTER_AVAILABILITY.afternoon,
      cardLine: `${shortDate} 오후 가능`,
    };
  }
  if (enriched.periodSlot === "both") {
    return {
      ...ROSTER_AVAILABILITY.available,
      cardLine: `${shortDate} 오전·오후 가능`,
    };
  }

  return {
    ...ROSTER_AVAILABILITY.available,
    cardLine: `${shortDate} 가능`,
  };
}

function availSortWeight(avail) {
  const order = { available: 0, morning: 1, afternoon: 2, busy: 3 };
  return order[avail?.key] ?? 9;
}

export function buildFieldTeamRoster({
  contacts = [],
  workDateStart = "",
  workDateEnd = "",
  schedules = [],
  regionLabel = "",
  inviteCountById = {},
}) {
  const list = (Array.isArray(contacts) ? contacts : []).map((c) => {
    const availability = resolveContactAvailabilityForRange(c, workDateStart, workDateEnd, schedules);
    return {
      contact: c,
      availability,
      roleLabel: contactRoleLabel(c),
      distanceLabel: contactDistanceLabel(c, regionLabel),
      recentWorkLabel: contactRecentWorkLabel(c),
      inviteCount: Number(inviteCountById[c.id]) || 0,
    };
  });

  const availableNow = list
    .filter((row) => row.availability.key !== "busy")
    .sort((a, b) => {
      const aw = availSortWeight(a.availability);
      const bw = availSortWeight(b.availability);
      if (aw !== bw) return aw - bw;
      const as = enrichContactTeam(a.contact, regionLabel).teamScore;
      const bs = enrichContactTeam(b.contact, regionLabel).teamScore;
      return bs - as;
    });

  const favorites = list.filter((row) => row.contact.favorite);
  const recentIds = new Set(pickRecentTeamContacts(contacts, 12).map((c) => c.id));
  const frequentIds = new Set(pickFrequentTeamContacts(contacts, 12).map((c) => c.id));

  const recent = list.filter((row) => recentIds.has(row.contact.id) && !row.contact.favorite);
  const frequent = list.filter(
    (row) => frequentIds.has(row.contact.id) && !row.contact.favorite && !recentIds.has(row.contact.id)
  );
  const saved = list.filter((row) => row.contact.phone);

  return {
    dateRangeLabel: formatDateRangeLabel(workDateStart, workDateEnd),
    availableNow,
    favorites,
    recent,
    frequent,
    saved,
  };
}

/**
 * 현장 등록 날짜 기준 자동 추천 4단계.
 * 신규 데이터 모델 없음 — useFieldScheduleStore(명시 가용 + 개인 일정)만 사용.
 */
export const RECOMMEND_TIER = {
  full: { key: "full", rank: 1, dot: "🟢", label: "가능", tone: "ok" },
  half: { key: "half", rank: 2, dot: "🟡", label: "반일 가능", tone: "partial" },
  unknown: { key: "unknown", rank: 3, dot: "⚪", label: "응답 없음", tone: "unknown" },
  busy: { key: "busy", rank: 4, dot: "⚫", label: "이미 일정 있음", tone: "busy" },
};

/**
 * 한 사람이 선택한 현장 날짜(범위)에 어느 단계인지 판정한다.
 * @returns {{ key, rank, dot, label, tone }}
 */
export function resolveRecommendTier(contact, workDateStart, workDateEnd, schedules = []) {
  const store = useFieldScheduleStore.getState();
  store.ensureSeeded();
  const ownerId = contact?.scheduleOwnerId || contact?.id;
  const dateKeys = listDateKeysBetween(workDateStart, workDateEnd);

  let busyDays = 0;
  let knownDays = 0;
  for (const key of dateKeys) {
    const explicit = store.getExplicitDayStatus(ownerId, key); // available | unavailable | null
    const personal = store.getPersonalEventsOnDay(ownerId, key);
    let dayBusy = false;
    let dayKnown = false;
    if (explicit === DAY_STATUS.unavailable) {
      dayBusy = true;
      dayKnown = true;
    } else if (explicit === DAY_STATUS.available) {
      dayKnown = true;
    }
    if (Array.isArray(personal) && personal.length > 0) {
      dayBusy = true;
      dayKnown = true;
    }
    if (dayBusy) busyDays += 1;
    if (dayKnown) knownDays += 1;
  }

  if (busyDays > 0) return RECOMMEND_TIER.busy;
  if (knownDays === 0) return RECOMMEND_TIER.unknown;

  const enriched = enrichContactTeam(contact);
  if (enriched.periodSlot === "morning" || enriched.periodSlot === "afternoon") return RECOMMEND_TIER.half;
  return RECOMMEND_TIER.full;
}

/**
 * 현장 날짜 기준 추천 명단.
 * 정렬: tier rank(완전가능→반일→응답없음→일정있음) → teamScore(즐겨찾기/협업이력/근접 등) 내림차순.
 * recommended = 완전가능 + 반일가능(= 가능 인원).
 * @returns {{
 *   dateRangeLabel: string,
 *   rows: Array<{ contact, tier, teamScore }>,
 *   recommended: Array<{ contact, tier, teamScore }>,
 *   availableCount: number,
 *   requiredCount: number,
 *   shortage: number,
 * }}
 */
export function buildScheduleRecommendation({
  contacts = [],
  workDateStart = "",
  workDateEnd = "",
  schedules = [],
  regionLabel = "",
  requiredCount = 0,
}) {
  const rows = (Array.isArray(contacts) ? contacts : [])
    .filter(Boolean)
    .map((c) => {
      const tier = resolveRecommendTier(c, workDateStart, workDateEnd, schedules);
      const teamScore = enrichContactTeam(c, regionLabel).teamScore;
      return { contact: c, tier, teamScore };
    })
    .sort((a, b) => {
      if (a.tier.rank !== b.tier.rank) return a.tier.rank - b.tier.rank;
      return b.teamScore - a.teamScore;
    });

  const recommended = rows.filter((r) => r.tier.key === "full" || r.tier.key === "half");
  const required = Math.max(0, Number(requiredCount) || 0);
  const availableCount = recommended.length;

  return {
    dateRangeLabel: formatDateRangeLabel(workDateStart, workDateEnd),
    rows,
    recommended,
    availableCount,
    requiredCount: required,
    shortage: Math.max(0, required - availableCount),
  };
}
