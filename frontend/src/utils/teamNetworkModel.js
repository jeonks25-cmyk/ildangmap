/**
 * 현장 인맥·팀 네트워크 (GPS/ERP 없음, mock·파생 기반)
 */
import { deriveFieldFlowEvents } from "./fieldFlowModel";
import { formatContactAvailabilityHint } from "./fieldContactsMock";
import { getOyajiSiteShortName, pickOyajiHeroJob } from "./oyajiSiteModel";

function contactSeed(id) {
  let h = 0;
  const s = String(id || "");
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** @returns {'today'|'week'|'unknown'} */
export function getContactTodayAvailTier(contact) {
  const hint = formatContactAvailabilityHint(contact);
  if (hint === "오늘 가능") return "today";
  if (hint === "이번 주 가능") return "week";
  return "unknown";
}

export function enrichContactTeam(contact, regionLabel = "") {
  if (!contact) return contact;
  const seed = contactSeed(contact.id);
  const coworkCountWeek = contact.favorite
    ? 2 + (seed % 5)
    : contact.hasCoworkHistory
      ? 1 + (seed % 4)
      : 0;

  const home = String(contact.homeRegion || "").trim();
  const areaToken = home.split(/\s+/).filter(Boolean).pop() || home || "";
  const frequentSiteLabel = coworkCountWeek >= 2 && areaToken ? `${areaToken} 현장 자주` : "";

  let periodSlot = "morning";
  if (seed % 5 === 0) periodSlot = "afternoon";
  else if (seed % 11 === 0) periodSlot = "both";

  const todayAvail = getContactTodayAvailTier(contact);
  const regionMatch =
    regionLabel && home && (home.includes(regionLabel) || regionLabel.includes(areaToken));

  const teamScore =
    (contact.favorite ? 12 : 0) +
    (contact.hasCoworkHistory ? 8 : 0) +
    coworkCountWeek * 2 +
    (todayAvail === "today" ? 10 : todayAvail === "week" ? 4 : 0) +
    (regionMatch ? 6 : 0);

  return {
    ...contact,
    coworkCountWeek,
    frequentSiteLabel,
    periodSlot,
    todayAvail,
    teamScore,
    regionMatch,
  };
}

/**
 * 전화번호부용 3단계 가용 상태 (🟢 오늘 가능 / 🟡 일정 있음 / ⚫ 응답 없음).
 * 기존 todayAvail(today/week/unknown)을 그대로 매핑한다 — 새 데이터 없음.
 * @returns {{ key: 'available'|'busy'|'none', label: string, dot: string }}
 */
export function getContactAvailabilityStatus(contact) {
  const tier = contact?.todayAvail || getContactTodayAvailTier(contact);
  if (tier === "today") return { key: "available", label: "오늘 가능", dot: "🟢" };
  if (tier === "week") return { key: "busy", label: "일정 있음", dot: "🟡" };
  return { key: "none", label: "응답 없음", dot: "⚫" };
}

/**
 * 상단 요약 집계: 전체 N명 + 상태별 인원 수.
 * @returns {{ total: number, available: number, busy: number, none: number }}
 */
export function buildTeamAvailabilitySummary(contacts) {
  const list = Array.isArray(contacts) ? contacts : [];
  let available = 0;
  let busy = 0;
  let none = 0;
  list.forEach((c) => {
    const st = getContactAvailabilityStatus(c).key;
    if (st === "available") available += 1;
    else if (st === "busy") busy += 1;
    else none += 1;
  });
  return { total: list.length, available, busy, none };
}

/** @returns {Array<{ icon: string, text: string }>} */
export function getContactTeamHints(contact) {
  const c = enrichContactTeam(contact);
  const hints = [];
  if (c.coworkCountWeek >= 2) {
    hints.push({ icon: "👥", text: `이번주 ${c.coworkCountWeek}회` });
  } else if (c.hasCoworkHistory) {
    hints.push({ icon: "👥", text: "최근 함께" });
  }
  if (c.frequentSiteLabel) {
    const short = c.frequentSiteLabel.replace(" 현장 자주", "");
    hints.push({ icon: "🏠", text: `${short} 자주` });
  }
  const seed = contactSeed(c.id);
  if (c.hasCoworkHistory && c.periodSlot === "morning" && seed % 3 !== 0) {
    hints.push({ icon: "🤝", text: "오전 같이" });
  }
  if (c.periodSlot === "morning") hints.push({ icon: "🕘", text: "오전 가능" });
  else if (c.periodSlot === "afternoon") hints.push({ icon: "🕐", text: "오후 가능" });
  else if (c.periodSlot === "both") hints.push({ icon: "🕘", text: "오전·오후" });

  return hints.slice(0, 3);
}

/** Hero·카드용 짧은 팀 리듬 (우리 팀 감) */
export function formatContactTeamRhythmShort(contact, regionLabel = "") {
  const c = enrichContactTeam(contact, regionLabel);
  const parts = [];
  if (c.coworkCountWeek >= 2) parts.push(`이번주 ${c.coworkCountWeek}회`);
  else if (c.hasCoworkHistory) parts.push("최근 함께");
  const seed = contactSeed(c.id);
  if (c.hasCoworkHistory && c.periodSlot === "morning" && seed % 3 !== 0) parts.push("오전 같이");
  if (c.frequentSiteLabel) parts.push(c.frequentSiteLabel);
  if (c.todayAvail === "today" && parts.length < 2) {
    const slot =
      c.periodSlot === "afternoon" ? "오후 가능" : c.periodSlot === "both" ? "오전·오후" : "오전 가능";
    parts.push(slot);
  }
  return parts.slice(0, 2).join(" · ");
}

/** 카드 한 줄 팀 리듬 */
export function formatContactTeamHintsLine(contact) {
  return getContactTeamHints(contact)
    .map((h) => `${h.icon} ${h.text}`)
    .join("  ");
}

const PERSON_FLOW_PRIORITY = {
  today_morning: 0,
  today_afternoon: 1,
  recent_done: 2,
  afternoon_join: 3,
  nearby: 4,
};

function buildPersonFlowLabel(contact) {
  const c = enrichContactTeam(contact);
  const name = c.name;
  if (c.todayAvail === "today") {
    if (c.periodSlot === "afternoon") return `오늘 오후 가능 · ${name}`;
    if (c.periodSlot === "both") return `오늘 오전·오후 · ${name}`;
    return `오늘 오전 가능 · ${name}`;
  }
  const seed = contactSeed(c.id);
  if (c.hasCoworkHistory && seed % 4 === 0) return `방금 현장 종료 · ${name}`;
  if (c.periodSlot === "afternoon" && seed % 3 !== 0) return `오후 합류 가능 · ${name}`;
  if (c.regionMatch && c.hasCoworkHistory) return `근처 작업중 · ${name}`;
  return `${name} · ${formatContactAvailabilityHint(c)}`;
}

export function personFlowKind(contact) {
  const c = enrichContactTeam(contact);
  if (c.todayAvail === "today" && c.periodSlot !== "afternoon") return "today_morning";
  if (c.todayAvail === "today" && c.periodSlot === "afternoon") return "today_afternoon";
  const seed = contactSeed(c.id);
  if (c.hasCoworkHistory && seed % 4 === 0) return "recent_done";
  if (c.periodSlot === "afternoon") return "afternoon_join";
  if (c.regionMatch) return "nearby";
  return "other";
}

/** @returns {Array<{ id: string, contactId: string, text: string, tone: string }>} */
export function derivePersonFlowEvents(contacts, { max = 3 } = {}) {
  const list = (Array.isArray(contacts) ? contacts : [])
    .map((c) => enrichContactTeam(c))
    .filter((c) => c.todayAvail === "today" || c.hasCoworkHistory || c.favorite)
    .map((c) => {
      const kind = personFlowKind(c);
      return {
        id: `person-flow-${c.id}-${kind}`,
        contactId: c.id,
        text: buildPersonFlowLabel(c),
        tone: c.todayAvail === "today" ? "active" : "normal",
        sortPri: PERSON_FLOW_PRIORITY[kind] ?? 9,
        sortScore: c.teamScore,
      };
    })
    .sort((a, b) => {
      if (a.sortPri !== b.sortPri) return a.sortPri - b.sortPri;
      return b.sortScore - a.sortScore;
    })
    .slice(0, max);

  return list.map(({ id, contactId, text, tone }) => ({ id, contactId, text, tone }));
}

/**
 * 현장·사람 흐름 얇게 연결 (위치추적 없음)
 * @returns {Array<{ id, text, tone, jobId?, contactId?, flowType: 'field'|'person' }>}
 */
export function deriveLinkedFlowEvents(jobs, contacts, regionLabel, { max = 4 } = {}) {
  const heroJob = pickOyajiHeroJob(jobs, regionLabel);
  const siteShort = heroJob ? getOyajiSiteShortName(heroJob) : "";

  const field = deriveFieldFlowEvents(jobs, regionLabel, { max: 2 }).map((e) => ({
    ...e,
    flowType: "field",
    jobId: e.jobId,
    contactId: null,
  }));

  const contactById = new Map((Array.isArray(contacts) ? contacts : []).map((c) => [c.id, c]));

  const person = derivePersonFlowEvents(contacts, { max: 3 }).map((e) => {
    let text = e.text;
    const c = contactById.get(e.contactId);
    const kind = c ? personFlowKind(enrichContactTeam(c, regionLabel)) : "";
    const linkable =
      siteShort &&
      (kind === "recent_done" || kind === "afternoon_join" || kind === "nearby" || text.includes("합류"));
    if (linkable && !text.includes(siteShort)) {
      text = `${text} · ${siteShort}`;
    }
    return {
      ...e,
      text,
      flowType: "person",
      jobId: linkable ? heroJob?.id : null,
      contactId: e.contactId,
    };
  });

  const merged = [];
  let fi = 0;
  let pi = 0;
  while (merged.length < max && (fi < field.length || pi < person.length)) {
    if (fi < field.length) merged.push(field[fi++]);
    if (merged.length < max && pi < person.length) merged.push(person[pi++]);
  }
  return merged.slice(0, max);
}

export function sortContactsByTeamPriority(contacts) {
  return [...(Array.isArray(contacts) ? contacts : [])]
    .map((c) => enrichContactTeam(c))
    .sort((a, b) => {
      if (b.coworkCountWeek !== a.coworkCountWeek) return b.coworkCountWeek - a.coworkCountWeek;
      const availOrder = { today: 0, week: 1, unknown: 2 };
      const aa = availOrder[a.todayAvail] ?? 2;
      const ab = availOrder[b.todayAvail] ?? 2;
      if (aa !== ab) return aa - ab;
      if (b.teamScore !== a.teamScore) return b.teamScore - a.teamScore;
      return String(a.name).localeCompare(String(b.name), "ko");
    });
}

export function pickFrequentTeamContacts(contacts, limit = 6) {
  return sortContactsByTeamPriority(contacts)
    .filter((c) => c.coworkCountWeek >= 2 || (c.favorite && c.hasCoworkHistory))
    .slice(0, limit);
}

export function pickAvailableNowContacts(contacts, limit = 6) {
  return sortContactsByTeamPriority(contacts)
    .filter((c) => c.todayAvail === "today")
    .slice(0, limit);
}

export function pickRecentTeamContacts(contacts, limit = 6) {
  return sortContactsByTeamPriority(contacts)
    .filter((c) => c.hasCoworkHistory)
    .slice(0, limit);
}

/**
 * Hero 현장에 맞는 부르기 좋은 사람 (추천 AI 아님, 현장 감)
 * @returns {Array<{ id: string, name: string, hint: string, contact: object }>}
 */
export function pickHeroTeamSuggestions(contacts, heroJob, regionLabel, limit = 3) {
  const craft = String(heroJob?.craft || heroJob?.role || "").trim();
  const list = (Array.isArray(contacts) ? contacts : []).map((c) => enrichContactTeam(c, regionLabel));

  const scored = list
    .filter((c) => c.favorite || c.hasCoworkHistory || c.todayAvail === "today")
    .map((c) => {
      let score = c.teamScore;
      if (craft && c.trade === craft) score += 5;
      if (c.todayAvail === "today") score += 4;
      return { contact: c, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ contact: c }) => {
    const periodHint =
      c.periodSlot === "afternoon" ? "오후 가능" : c.periodSlot === "both" ? "오전·오후" : "오전 가능";
    const teamRhythm = formatContactTeamRhythmShort(c, regionLabel);
    const hint =
      teamRhythm ||
      (c.todayAvail === "today"
        ? periodHint
        : c.coworkCountWeek >= 2
          ? `이번주 ${c.coworkCountWeek}회`
          : "최근 함께");
    return {
      id: c.id,
      name: c.name,
      hint,
      teamRhythm: teamRhythm || hint,
      chipLabel: `${c.name} · ${hint}`,
      contact: c,
    };
  });
}
