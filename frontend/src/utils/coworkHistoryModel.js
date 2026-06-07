/**
 * 협업 이력 — 현장 종료 + accepted 참석자 기준.
 * coworkHistory가 단일 소스이며 count / lastWorkedAt / 최근 현장은 모두 여기서 파생한다.
 * 평판·별점·배지·랭킹 없음.
 */
import { CRAFT_LABEL } from "./jobModel";
import { contactStableUserId } from "./fieldContactsMock";
import { toDateKey } from "./fieldScheduleModel";
import { getScheduleParticipants } from "./scheduleFieldOpsStorage";
import { getScheduleEndDateKey } from "./scheduleModel";

/** @typedef {{ id:string, contactId:string, scheduleId:string, siteName:string, workDate:string, craft:string, recordedAt:string }} CoworkHistoryEntry */

export function isAcceptedInviteStatus(status) {
  const st = String(status || "").toLowerCase();
  return st === "accepted" || st === "confirmed";
}

export function isScheduleEnded(schedule, today = new Date()) {
  if (!schedule) return false;
  const status = String(schedule.status || "").toLowerCase();
  const settlement = String(schedule.settlementStatus || "").toLowerCase();
  if (status === "completed" || settlement === "settled") return true;
  const end = getScheduleEndDateKey(schedule) || String(schedule.workDate || "").slice(0, 10);
  if (!end) return false;
  return end < toDateKey(today);
}

export function getScheduleWorkedAtKey(schedule) {
  return getScheduleEndDateKey(schedule) || String(schedule.workDate || "").slice(0, 10);
}

export function getAcceptedParticipantsFromSchedule(schedule) {
  return getScheduleParticipants(schedule).filter(
    (p) => p.role !== "owner" && isAcceptedInviteStatus(p.inviteStatus)
  );
}

export function resolveContactIdForParticipant(participant, contacts) {
  const list = Array.isArray(contacts) ? contacts : [];
  const uid = Number(participant?.userId);
  if (Number.isFinite(uid)) {
    const byUser = list.find((c) => contactStableUserId(c) === uid);
    if (byUser) return String(byUser.id);
  }
  const name = String(participant?.name || "").trim();
  if (name) {
    const byName = list.find((c) => String(c.name || "").trim() === name);
    if (byName) return String(byName.id);
  }
  return null;
}

function historyEntryId(contactId, scheduleId) {
  return `${contactId}::${scheduleId}`;
}

export function buildCoworkHistoryEntry(schedule, contactId) {
  const scheduleId = String(schedule.id);
  const workDate = getScheduleWorkedAtKey(schedule);
  return {
    id: historyEntryId(contactId, scheduleId),
    contactId: String(contactId),
    scheduleId,
    siteName: String(schedule.title || "현장").trim() || "현장",
    workDate: workDate || String(schedule.workDate || "").slice(0, 10),
    craft: String(schedule.craft || "").trim(),
    recordedAt: new Date().toISOString(),
  };
}

function sortHistoryNewestFirst(a, b) {
  const dateDiff = String(b.workDate || "").localeCompare(String(a.workDate || ""));
  if (dateDiff !== 0) return dateDiff;
  return String(b.recordedAt || "").localeCompare(String(a.recordedAt || ""));
}

/** contactId별 협업 횟수 맵 (그룹 보드 정렬용) */
export function buildCoworkCountByContactId(coworkHistory = []) {
  const counts = {};
  (Array.isArray(coworkHistory) ? coworkHistory : []).forEach((entry) => {
    const id = String(entry?.contactId || "");
    if (!id) return;
    counts[id] = (counts[id] || 0) + 1;
  });
  return counts;
}

/** count + lastWorkedAt — coworkHistory에서 파생 */
export function deriveCoworkStats(contactId, coworkHistory = []) {
  const id = String(contactId || "");
  if (!id) return { count: 0, lastWorkedAt: null };
  const rows = (Array.isArray(coworkHistory) ? coworkHistory : [])
    .filter((e) => String(e.contactId) === id)
    .sort(sortHistoryNewestFirst);
  if (!rows.length) return { count: 0, lastWorkedAt: null };
  return {
    count: rows.length,
    lastWorkedAt: rows[0].workDate || null,
  };
}

/** 최신순 협업 현장 이력 */
export function listCoworkHistoryForContact(contactId, coworkHistory = [], limit = null) {
  const id = String(contactId || "");
  const rows = (Array.isArray(coworkHistory) ? coworkHistory : [])
    .filter((e) => String(e.contactId) === id)
    .sort(sortHistoryNewestFirst);
  if (limit != null && Number.isFinite(Number(limit))) return rows.slice(0, Number(limit));
  return rows;
}

/** 명함 최근 현장 목록용 */
export function listRecentCoworkSites(contactId, coworkHistory = [], limit = 5) {
  return listCoworkHistoryForContact(contactId, coworkHistory, limit).map((e) => ({
    id: e.id,
    title: e.siteName,
    name: e.siteName,
    workDate: e.workDate,
    craft: e.craft,
    craftLabel: CRAFT_LABEL[e.craft] || e.craft || "",
  }));
}

export function formatCoworkCraftLabel(craft) {
  return CRAFT_LABEL[craft] || craft || "";
}

/**
 * 종료된 현장 → coworkHistory 기록(중복 scheduleId+contactId 방지).
 */
export function applyCoworkFromEndedSchedules({
  schedules,
  contacts,
  coworkHistory = [],
  processedScheduleIds = [],
}) {
  const history = [...(Array.isArray(coworkHistory) ? coworkHistory : [])];
  const existingKeys = new Set(history.map((e) => historyEntryId(e.contactId, e.scheduleId)));
  const processed = new Set((Array.isArray(processedScheduleIds) ? processedScheduleIds : []).map(String));
  const contactList = Array.isArray(contacts) ? contacts : [];
  let newlyProcessedCount = 0;

  (Array.isArray(schedules) ? schedules : []).forEach((schedule) => {
    if (!schedule?.id || !isScheduleEnded(schedule)) return;
    const scheduleId = String(schedule.id);
    if (processed.has(scheduleId)) return;

    getAcceptedParticipantsFromSchedule(schedule).forEach((p) => {
      const contactId = resolveContactIdForParticipant(p, contactList);
      if (!contactId) return;
      const key = historyEntryId(contactId, scheduleId);
      if (existingKeys.has(key)) return;
      const entry = buildCoworkHistoryEntry(schedule, contactId);
      history.push(entry);
      existingKeys.add(key);
    });

    processed.add(scheduleId);
    newlyProcessedCount += 1;
  });

  return {
    coworkHistory: history,
    processedScheduleIds: [...processed],
    newlyProcessedCount,
  };
}

export function formatLastWorkedAt(dateKey) {
  if (!dateKey) return "";
  return String(dateKey).slice(0, 10);
}
