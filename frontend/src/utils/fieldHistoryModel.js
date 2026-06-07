import { MAP_ITEM_TYPE_LABEL } from "../constants/mapItemTypes";
import { getScheduleDurationDays } from "./scheduleModel";

function cleanText(value) {
  return String(value || "").trim();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object";
}

function safeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function normalizeKeyText(value) {
  return cleanText(value).replace(/\s+/g, " ").toLowerCase().slice(0, 90);
}

function pickAddressText(record) {
  if (!isPlainObject(record)) return "";
  return cleanText(
    record?.privateFields?.fullAddress ||
      record?.fullAddress ||
      record?.addressDetail ||
      record?.address ||
      record?.siteName ||
      record?.shortRegion ||
      record?.shortAddress ||
      record?.title
  );
}

function normalizeSiteFamilyText(value) {
  const text = cleanText(value)
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b\d{1,4}\s*(동|호|층|세대)\b/g, " ")
    .replace(/\b\d{1,4}[-~]\d{1,4}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const tokens = text.split(/\s+/).filter(Boolean);
  const buildingIndex = tokens.findIndex((token) => /(아파트|상가|오피스텔|빌딩|타워|센터|프라자|주상복합)$/.test(token));
  if (buildingIndex >= 0) return tokens.slice(0, buildingIndex + 1).join(" ");
  return tokens.slice(0, Math.min(tokens.length, 3)).join(" ");
}

function getDateKey(value) {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function pickSiteLabel(record = {}) {
  if (!isPlainObject(record)) return "현장 프로필";
  return (
    cleanText(record?.siteLabel) ||
    cleanText(record?.siteName) ||
    cleanText(record?.shortRegion) ||
    cleanText(record?.shortAddress) ||
    cleanText(record?.address) ||
    cleanText(record?.title) ||
    "현장 프로필"
  );
}

export function getFieldProfileKey(record) {
  if (!isPlainObject(record)) return null;
  const key = normalizeKeyText(pickAddressText(record));
  return key ? `site:${key}` : null;
}

export function getFieldProfileFamilyKey(record) {
  if (!isPlainObject(record)) return null;
  const family = normalizeKeyText(normalizeSiteFamilyText(pickAddressText(record)));
  return family ? `site-family:${family}` : null;
}

function countTop(values, limit = 3) {
  const counts = new Map();
  safeArray(values)
    .map(cleanText)
    .filter(Boolean)
    .forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function createProfile(seed = {}) {
  if (!isPlainObject(seed)) return null;
  const key = getFieldProfileKey(seed);
  if (!key) return null;
  const label = pickSiteLabel(seed);
  return {
    key,
    familyKey: getFieldProfileFamilyKey(seed),
    label,
    siteKind: seed?.siteKind || "",
    visits: [],
    teams: [],
    crafts: [],
    durations: [],
    requiredItems: [],
    materialNotes: [],
    accessTips: [],
    parkingTips: [],
    mealTips: [],
    experienceItems: [],
    timelineEvents: [],
  };
}

function pushIf(list, value) {
  const text = cleanText(value);
  if (text && Array.isArray(list)) list.push(text);
}

function getShiftLabel(record) {
  if (record?.workType === "morning") return "오전";
  if (record?.workType === "afternoon") return "오후";
  if (record?.workType === "shortHelp") return "짧은 헬프";
  return "종일";
}

function addVisit(profile, schedule, job) {
  if (!profile) return;
  const source = { ...(job || {}), ...(schedule || {}) };
  if (!isPlainObject(source)) return;
  const duration = getScheduleDurationDays(source);
  profile.visits.push({
    id: source.id || `${source.workDate}-${profile.visits.length}`,
    date: getDateKey(source.workDate || source.date),
    title: source.title || job?.title || profile.label,
    teamName: source.teamName || source.assignedWorker || "",
    craft: source.craft || job?.craft || "",
    durationDays: duration,
    shiftLabel: getShiftLabel(source),
  });
  profile.durations.push(duration);
  pushIf(profile.teams, source.teamName || source.assignedWorker);
  pushIf(profile.crafts, source.craft || job?.craft || source.trade);
  pushIf(profile.requiredItems, source.requiredItems || job?.requiredItems);
  pushIf(profile.materialNotes, source.materialNote || job?.materialNote);
  pushIf(profile.accessTips, source.accessNote || source.accessPassword || job?.accessNote);
  pushIf(profile.parkingTips, source.parkingNote || job?.parkingNote);
  pushIf(profile.mealTips, source.mealNote || job?.mealNote);
}

function addExperience(profile, item) {
  if (!profile || !isPlainObject(item)) return;
  const typeLabel = MAP_ITEM_TYPE_LABEL[item?.type] || "현장 경험";
  const title = cleanText(item?.title || item?.meta?.text || item?.meta?.memo || typeLabel);
  profile.experienceItems.push({
    id: item?.id || `${item?.type || "item"}-${profile.experienceItems.length}`,
    type: item?.type,
    typeLabel,
    title,
    savedAt: item?.savedAt || item?.createdAt || item?.sourceMeta?.updatedAt || "",
  });
  const text = title || cleanText(item?.meta?.note);
  if (/주차/.test(typeLabel + text)) pushIf(profile.parkingTips, text);
  if (/출입|엘리베이터|동선/.test(typeLabel + text)) pushIf(profile.accessTips, text);
  if (/식당|식사|점심/.test(typeLabel + text)) pushIf(profile.mealTips, text);
  if (/자재|상차|픽업/.test(typeLabel + text)) pushIf(profile.materialNotes, text);
  if (title) {
    profile.timelineEvents.push({
      id: `experience:${item?.id || title}`,
      type: "experience",
      tone: item?.type === "sos" ? "urgent" : "memory",
      icon: item?.type === "sos" ? "SOS" : "메모",
      text: `${typeLabel} 추가`,
      detail: title,
      occurredAt: item?.savedAt || item?.createdAt || item?.sourceMeta?.updatedAt || "",
    });
  }
}

function addTimeline(profile, event) {
  if (!profile || !isPlainObject(event)) return;
  profile.timelineEvents.push({
    id: event?.id || `timeline:${profile.timelineEvents.length}`,
    type: event?.type || "note",
    tone: event?.tone || "normal",
    icon: event?.icon || "•",
    text: cleanText(event?.text || event?.detail || "현장 흐름 기록"),
    detail: cleanText(event?.detail),
    teamName: cleanText(event?.teamName),
    occurredAt: event?.occurredAt || event?.savedAt || "",
  });
}

function summarizeProfile(profile) {
  if (!profile) return null;
  const visits = safeArray(profile.visits);
  const durations = safeArray(profile.durations);
  const visitCount = visits.length;
  const avgDuration =
    durations.length > 0
      ? Math.max(1, Math.round(durations.reduce((sum, value) => sum + Number(value || 0), 0) / durations.length))
      : 1;
  const topTeams = countTop(profile?.teams);
  const topCrafts = countTop(profile?.crafts);
  const topRequiredItems = countTop(profile?.requiredItems);
  const topMaterials = countTop(profile?.materialNotes);
  const topParkingTips = countTop(profile?.parkingTips);
  const topAccessTips = countTop(profile?.accessTips);
  const topMealTips = countTop(profile?.mealTips);
  const recentVisits = [...visits]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 4);
  const derivedVisitEvents = visits.map((visit) => ({
    id: `visit:${visit.id}`,
    type: "visit",
    tone: "normal",
    icon: "작업",
    text: `${visit.date || "날짜 미정"} 작업`,
    detail: [visit.teamName, visit.shiftLabel, `${visit.durationDays}일`].filter(Boolean).join(" · "),
    teamName: visit.teamName,
    occurredAt: visit.date || "",
  }));
  const primaryTeam = topTeams[0]?.label || "";
  const teamRhythm = topTeams.map((team) => {
    const teamVisits = visits.filter((visit) => visit?.teamName === team.label);
    const shift = countTop(teamVisits.map((visit) => visit?.shiftLabel), 1)[0]?.label || "";
    const craft = countTop(teamVisits.map((visit) => visit?.craft), 1)[0]?.label || "";
    const avg =
      teamVisits.length > 0
        ? Math.max(1, Math.round(teamVisits.reduce((sum, visit) => sum + Number(visit?.durationDays || 1), 0) / teamVisits.length))
        : 1;
    return {
      name: team.label,
      count: team.count,
      shift,
      craft,
      avgDurationDays: avg,
      line: [shift ? `${shift} 리듬` : "", craft, `${avg}일 페이스`].filter(Boolean).join(" · "),
    };
  });
  const memoryLine = [
    visitCount ? `이전 ${visitCount}회` : "",
    avgDuration ? `보통 ${avgDuration}일` : "",
    primaryTeam ? `지난 팀 ${primaryTeam}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const timelineEvents = [...safeArray(profile.timelineEvents), ...derivedVisitEvents]
    .filter((event) => event.text)
    .sort((a, b) => String(b.occurredAt || "").localeCompare(String(a.occurredAt || "")))
    .slice(0, 12);
  const rhythmSummary = deriveFieldRhythmSummary({
    visitCount,
    avgDuration,
    primaryTeam,
    topTeams,
    teamRhythm,
  });
  const atmosphereSummary = deriveFieldAtmosphereSummary({
    topParkingTips,
    topAccessTips,
    topMealTips,
    topMaterials,
    experienceItems: profile.experienceItems,
  });
  const changePatternSummary = deriveFieldChangePattern(timelineEvents);
  const workStyle = deriveFieldWorkStyle({ avgDuration, visits, timelineEvents });
  const operationMood = deriveFieldOperationMood(timelineEvents, {
    topParkingTips,
    topAccessTips,
    topMealTips,
    topMaterials,
  });
  const fieldCharacter = deriveFieldCharacter({
    workStyle,
    operationMood,
    changePatternSummary,
    rhythmSummary,
    teamRhythm,
  });
  const characterLine = fieldCharacter.slice(0, 2).join(" · ");
  const familiarMemory = deriveFamiliarSiteMemory({
    profile,
    fieldCharacter,
    atmosphereSummary,
    teamRhythm,
    topParkingTips,
    topAccessTips,
  });

  return {
    ...profile,
    visitCount,
    avgDuration,
    topTeams,
    topCrafts,
    topRequiredItems,
    topMaterials,
    topParkingTips,
    topAccessTips,
    topMealTips,
    recentVisits,
    teamRhythm,
    primaryTeam,
    memoryLine,
    reusableItemCount: safeArray(profile.experienceItems).length,
    rhythmSummary,
    atmosphereSummary,
    changePatternSummary,
    workStyle,
    operationMood,
    fieldCharacter,
    characterLine,
    familiarMemory,
    memoryHighlights: [...fieldCharacter, ...changePatternSummary, ...atmosphereSummary, ...rhythmSummary].slice(0, 5),
    timelineEvents,
  };
}

export function deriveFamiliarSiteMemory({
  profile,
  fieldCharacter = [],
  atmosphereSummary = [],
  teamRhythm = [],
  topParkingTips = [],
  topAccessTips = [],
} = {}) {
  const lines = [];
  if (profile?.familyKey && profile?.familyKey !== profile?.key) lines.push("예전에 작업했던 현장 계열");
  if (safeArray(teamRhythm).length) lines.push("이전 팀 흐름이 따라오는 현장");
  if (topAccessTips?.[0]?.label) lines.push("출입 메모 기억 있음");
  if (topParkingTips?.[0]?.label) lines.push("주차 기억 있음");
  safeArray(fieldCharacter).slice(0, 1).forEach((line) => lines.push(line));
  safeArray(atmosphereSummary).slice(0, 1).forEach((line) => lines.push(line));
  return [...new Set(lines)].slice(0, 3);
}

export function deriveFieldWorkStyle({ avgDuration = 1, visits = [], timelineEvents = [] } = {}) {
  const list = safeArray(timelineEvents);
  const visitList = safeArray(visits);
  const lines = [];
  const afternoonCount = list.filter((event) => /오후/.test(`${event?.text || ""} ${event?.detail || ""}`)).length;
  const morningCount = list.filter((event) => /오전/.test(`${event?.text || ""} ${event?.detail || ""}`)).length;
  const extendCount = list.filter((event) => /연장|하루 더|3일/.test(`${event?.text || ""} ${event?.detail || ""}`)).length;
  if (avgDuration >= 3) lines.push("보통 2~3일은 잡는 현장");
  else if (avgDuration === 2) lines.push("보통 이틀 흐름으로 보는 현장");
  else if (visitList.length >= 2) lines.push("대체로 당일 정리되는 현장");
  if (extendCount >= 2) lines.push("지난번에도 하루 더 보는 일이 있었음");
  if (afternoonCount >= 2) lines.push("보통 오후에 조금 밀리는 편");
  else if (morningCount >= 2) lines.push("오전 시작 리듬이 많은 편");
  return lines.slice(0, 3);
}

export function deriveFieldOperationMood(events = [], hints = {}) {
  const list = safeArray(events);
  const lines = [];
  const textBlob = list.map((event) => `${event?.text || ""} ${event?.detail || ""}`).join(" ");
  const parking = hints?.topParkingTips?.[0]?.label || "";
  const access = hints?.topAccessTips?.[0]?.label || "";
  const meal = hints?.topMealTips?.[0]?.label || "";
  const material = hints?.topMaterials?.[0]?.label || "";
  const teamRecallCount = list.filter((event) => event?.type === "team_recall").length;
  const sosCount = list.filter((event) => event?.type === "sos").length;
  if (/엘리베이터|엘베|대기/.test(textBlob + access)) lines.push("엘리베이터 대기 기억이 있는 현장");
  if (/주차.*편|무료 주차|주차 가능/.test(textBlob + parking)) lines.push("주차는 비교적 편했던 현장");
  else if (/주차.*혼잡|혼잡/.test(textBlob + parking)) lines.push("주차 혼잡 시간은 다시 확인하는 편");
  if (/관리실.*느림|응답 느림/.test(textBlob)) lines.push("관리실 응답은 느린 편으로 기억됨");
  else if (/관리실|경비실|출입/.test(textBlob + access)) lines.push("출입/관리실 확인이 필요한 현장");
  if (material) lines.push("자재 동선 기억이 남아 있는 현장");
  if (meal && lines.length < 3) lines.push(`점심은 ${meal} 쪽을 많이 봄`);
  if (teamRecallCount >= 1) lines.push("팀을 다시 부른 흐름이 있었음");
  if (sosCount >= 1) lines.push("긴급 도움 기록은 다시 확인할 현장");
  return [...new Set(lines)].slice(0, 3);
}

export function deriveFieldCharacter({
  workStyle = [],
  operationMood = [],
  changePatternSummary = [],
  rhythmSummary = [],
  teamRhythm = [],
} = {}) {
  const lines = [];
  safeArray(workStyle).forEach((line) => lines.push(line));
  safeArray(operationMood).forEach((line) => lines.push(line));
  if (!lines.length) safeArray(changePatternSummary).forEach((line) => lines.push(line));
  const team = safeArray(teamRhythm).find((item) => item?.count >= 2);
  if (team) lines.push(`${team.name}와 다시 맞추기 쉬운 현장`);
  if (!lines.length) safeArray(rhythmSummary).forEach((line) => lines.push(line));
  return [...new Set(lines)].slice(0, 4);
}

export function deriveFieldRhythmSummary({ visitCount = 0, avgDuration = 1, primaryTeam = "", topTeams = [], teamRhythm = [] } = {}) {
  const summary = [];
  if (visitCount >= 2) summary.push(`이 현장은 보통 ${avgDuration}일 흐름`);
  if (primaryTeam) {
    const team = safeArray(teamRhythm).find((item) => item?.name === primaryTeam);
    summary.push(`${primaryTeam}와 ${topTeams[0]?.count || 1}번 같이 움직임${team?.shift ? ` · ${team.shift} 위주` : ""}`);
  }
  return summary.slice(0, 2);
}

export function deriveFieldAtmosphereSummary({
  topParkingTips = [],
  topAccessTips = [],
  topMealTips = [],
  topMaterials = [],
  experienceItems = [],
} = {}) {
  const summary = [];
  const parking = topParkingTips?.[0]?.label || "";
  const access = topAccessTips?.[0]?.label || "";
  const meal = topMealTips?.[0]?.label || "";
  const material = topMaterials?.[0]?.label || "";
  if (parking) summary.push(parking.includes("혼잡") ? "주차 혼잡 메모가 자주 남음" : `주차는 ${parking}`);
  if (access) summary.push(access.includes("엘리베이터") ? "엘리베이터/출입 동선 기억 있음" : `출입은 ${access}`);
  if (material) summary.push(`자재는 ${material}`);
  if (meal && summary.length < 3) summary.push(`점심은 ${meal}`);
  if (!summary.length && safeArray(experienceItems).length) summary.push("현장 메모가 다음 작업에 따라옴");
  return summary.slice(0, 3);
}

export function deriveFieldChangePattern(events = []) {
  const list = safeArray(events);
  const summary = [];
  const extendCount = list.filter((event) => /연장|하루 더|3일/.test(`${event?.text || ""} ${event?.detail || ""}`)).length;
  const afternoonCount = list.filter((event) => /오후/.test(`${event?.text || ""} ${event?.detail || ""}`)).length;
  const morningCount = list.filter((event) => /오전/.test(`${event?.text || ""} ${event?.detail || ""}`)).length;
  const memoCount = list.filter((event) => event?.type === "map_memo" || event?.type === "field_atmosphere" || event?.type === "experience").length;
  if (extendCount >= 2) summary.push("최근 일정은 하루 연장되는 흐름");
  else if (extendCount === 1) summary.push("최근 한 번 일정 연장됨");
  if (afternoonCount >= 2) summary.push("최근 오후 시작으로 바뀌는 편");
  else if (morningCount >= 2) summary.push("최근 오전 시작이 많음");
  if (memoCount >= 2) summary.push("현장 분위기 메모가 자주 남음");
  return summary.slice(0, 3);
}

export function buildFieldHistoryProfiles(input = {}) {
  try {
    const {
      schedules = [],
      jobs = [],
      mapItems = [],
      memoryItemsByKey = {},
      memoryRecordsByKey = {},
    } = isPlainObject(input) ? input : {};
    const safeSchedules = safeArray(schedules);
    const safeJobs = safeArray(jobs);
    const safeMapItems = safeArray(mapItems);
    const safeMemoryItemsByKey = isPlainObject(memoryItemsByKey) ? memoryItemsByKey : {};
    const safeMemoryRecordsByKey = isPlainObject(memoryRecordsByKey) ? memoryRecordsByKey : {};
    const profiles = new Map();
    const jobById = new Map(safeJobs.map((job) => [String(job?.id), job]));

    safeSchedules.forEach((schedule) => {
      if (!isPlainObject(schedule)) return;
      const job = schedule?.jobId != null ? jobById.get(String(schedule.jobId)) : null;
      const seed = { ...(isPlainObject(job) ? job : {}), ...schedule };
      const key = getFieldProfileKey(seed);
      if (!key) return;
      if (!profiles.has(key)) {
        const profile = createProfile(seed);
        if (profile) profiles.set(key, profile);
      }
      addVisit(profiles.get(key), schedule, job);
    });

    safeJobs.forEach((job) => {
      if (!isPlainObject(job)) return;
      const key = getFieldProfileKey(job);
      if (!key || profiles.has(key)) return;
      const profile = createProfile(job);
      if (!profile) return;
      addVisit(profile, job, job);
      profiles.set(key, profile);
    });

    safeMapItems.forEach((item) => {
      if (!isPlainObject(item)) return;
      const relatedJob = item?.relatedFieldId != null ? jobById.get(String(item.relatedFieldId)) : null;
      const seed = relatedJob || item;
      const key = getFieldProfileKey(seed);
      if (!key) return;
      if (!profiles.has(key)) {
        const profile = createProfile(seed);
        if (profile) profiles.set(key, profile);
      }
      addExperience(profiles.get(key), item);
    });

    Object.entries(safeMemoryItemsByKey).forEach(([key, items]) => {
      if (!profiles.has(key)) return;
      safeArray(items).forEach((item) => addExperience(profiles.get(key), item));
    });

    Object.entries(safeMemoryRecordsByKey).forEach(([key, record]) => {
      if (!profiles.has(key) || !isPlainObject(record)) return;
      safeArray(record?.visits).forEach((visit) => addVisit(profiles.get(key), visit, null));
      safeArray(record?.timeline).forEach((event) => addTimeline(profiles.get(key), event));
    });

    return [...profiles.values()].map(summarizeProfile).filter(Boolean);
  } catch (_) {
    return [];
  }
}

export function getFieldHistoryPreview(profile) {
  if (!profile) return null;
  return {
    line: profile.characterLine || profile.fieldCharacter?.[0] || profile.memoryLine || "아직 쌓인 현장 기억 없음",
    characterLine: profile.characterLine || profile.fieldCharacter?.[0] || "",
    memoryHighlights: profile.memoryHighlights?.slice(0, 3) || [],
    chips: [
      profile.topRequiredItems?.[0]?.label ? `준비물 ${profile.topRequiredItems[0].label}` : "",
      profile.topMaterials?.[0]?.label ? `자재 ${profile.topMaterials[0].label}` : "",
      profile.reusableItemCount ? `생활팁 ${profile.reusableItemCount}개` : "",
    ].filter(Boolean),
  };
}
