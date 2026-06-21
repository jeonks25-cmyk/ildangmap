import { buildFieldJobTitle, migrateJob } from "./jobModel";
import { buildDemoWorkerAssignments, normalizeWorkerAssignments } from "./workerAssignmentModel";

export const SCHEDULES_STORAGE_KEY = "calendar_schedules_v2";
export const SCHEDULE_SETTLEMENT_STATUS = {
  WAITING: "waiting",
  SETTLED: "settled",
  REVIEW: "review",
};

export const SCHEDULE_SETTLEMENT_STATUS_META = {
  waiting: { label: "정산대기", tone: "waiting" },
  settled: { label: "정산완료", tone: "settled" },
  review: { label: "정산확인 필요", tone: "review" },
};

export const SCHEDULE_SHIFT_TYPE = {
  FULL: "full",
  HALF: "half",
  NIGHT: "night",
};

function parsePayAmount(pay) {
  const num = Number(String(pay ?? "").replace(/[^0-9]/g, ""));
  return Number.isFinite(num) && num > 0 ? num : 0;
}

export function getPayAmount(pay) {
  return parsePayAmount(pay);
}

export function formatWon(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num)) return "0원";
  return `${Math.round(num).toLocaleString()}원`;
}

export function formatManAverage(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num) || num <= 0) return "0만";
  const man = num / 10000;
  return `${man.toFixed(1)}만`;
}

export function getScheduleSettlementStatusMeta(schedule) {
  const key = schedule?.settlementStatus;
  return SCHEDULE_SETTLEMENT_STATUS_META[key] || SCHEDULE_SETTLEMENT_STATUS_META.waiting;
}

function getDefaultShiftType(schedule) {
  if (schedule?.shiftType === SCHEDULE_SHIFT_TYPE.FULL) return SCHEDULE_SHIFT_TYPE.FULL;
  if (schedule?.shiftType === SCHEDULE_SHIFT_TYPE.HALF) return SCHEDULE_SHIFT_TYPE.HALF;
  if (schedule?.shiftType === SCHEDULE_SHIFT_TYPE.NIGHT) return SCHEDULE_SHIFT_TYPE.NIGHT;
  if (schedule?.nightWork) return SCHEDULE_SHIFT_TYPE.NIGHT;
  if (schedule?.workType === "morning" || schedule?.workType === "afternoon" || schedule?.workType === "shortHelp") {
    return SCHEDULE_SHIFT_TYPE.HALF;
  }
  return SCHEDULE_SHIFT_TYPE.FULL;
}

export function getScheduleBasePayAmount(schedule) {
  const explicit = Number(schedule?.basePayAmount);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  return parsePayAmount(schedule?.pay);
}

export function getScheduleNightAllowanceAmount(schedule) {
  const explicit = Number(schedule?.nightAllowanceAmount);
  if (Number.isFinite(explicit) && explicit >= 0) return explicit;
  return getDefaultShiftType(schedule) === SCHEDULE_SHIFT_TYPE.NIGHT ? 30000 : 0;
}

export function getScheduleHalfDayRate(schedule) {
  const explicit = Number(schedule?.halfDayRate);
  if (Number.isFinite(explicit) && explicit > 0 && explicit <= 1) return explicit;
  return 0.6;
}

export function calculateScheduleSettlementAmount(schedule) {
  const basePayAmount = getScheduleBasePayAmount(schedule);
  const shiftType = getDefaultShiftType(schedule);
  const adjustedBase =
    shiftType === SCHEDULE_SHIFT_TYPE.HALF ? Math.round(basePayAmount * getScheduleHalfDayRate(schedule)) : basePayAmount;
  return (adjustedBase + getScheduleNightAllowanceAmount(schedule)) * getScheduleDurationDays(schedule);
}

export function getScheduleSettlementNotes(schedule) {
  const notes = [];
  const shiftType = getDefaultShiftType(schedule);
  if (shiftType === SCHEDULE_SHIFT_TYPE.HALF) notes.push("반일작업");
  if (shiftType === SCHEDULE_SHIFT_TYPE.NIGHT) {
    notes.push(`야간수당 +${formatWon(getScheduleNightAllowanceAmount(schedule))}`);
  }
  if (schedule?.settlementStatus === SCHEDULE_SETTLEMENT_STATUS.REVIEW) notes.push("확인 필요");
  return notes;
}

export function getScheduleUnsettledWorkers(schedule) {
  const crewCount = Number(schedule?.crewCount);
  const settledWorkerCount = Number(schedule?.settledWorkerCount);
  const safeCrew = Number.isFinite(crewCount) && crewCount >= 0 ? Math.round(crewCount) : 1;
  const safeSettled = Number.isFinite(settledWorkerCount) && settledWorkerCount >= 0 ? Math.round(settledWorkerCount) : 0;
  return Math.max(0, safeCrew - safeSettled);
}

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateKeyValue(value) {
  const date = value instanceof Date ? new Date(value) : new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? null : date;
}

function scheduleDateKeyFromWorkDate(workDate) {
  const date = parseDateKeyValue(workDate);
  return date ? toDateKey(date) : "";
}

export function addDaysToDateKey(dateKey, days) {
  const date = parseDateKeyValue(dateKey);
  if (!date) return "";
  date.setDate(date.getDate() + Number(days || 0));
  return toDateKey(date);
}

function diffDateKeys(startKey, endKey) {
  const start = parseDateKeyValue(startKey);
  const end = parseDateKeyValue(endKey);
  if (!start || !end) return 0;
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endUtc - startUtc) / 86400000);
}

export function getScheduleDurationDays(schedule) {
  const explicit = Number(schedule?.durationDays);
  if (Number.isFinite(explicit) && explicit >= 1) return Math.max(1, Math.round(explicit));
  const startKey = scheduleDateKeyFromWorkDate(schedule?.workDate);
  const endKey = scheduleDateKeyFromWorkDate(
    schedule?.endDate || schedule?.workDateEnd || schedule?.workEndDate
  );
  if (startKey && endKey) return Math.max(1, diffDateKeys(startKey, endKey) + 1);
  return 1;
}

export function getScheduleEndDateKey(schedule) {
  const startKey = scheduleDateKeyFromWorkDate(schedule?.workDate);
  if (!startKey) return "";
  return addDaysToDateKey(startKey, getScheduleDurationDays(schedule) - 1);
}

export function getScheduleDateKeys(schedule) {
  const startKey = scheduleDateKeyFromWorkDate(schedule?.workDate);
  if (!startKey) return [];
  const duration = getScheduleDurationDays(schedule);
  return Array.from({ length: duration }, (_, index) => addDaysToDateKey(startKey, index)).filter(Boolean);
}

export function scheduleCoversDate(schedule, dateKey) {
  if (!dateKey) return false;
  return getScheduleDateKeys(schedule).includes(dateKey);
}

function shiftDateKey(offsetDays) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return toDateKey(date);
}

function CRAFT_LABEL_FALLBACK(craft) {
  const map = {
    film: "필름",
    tile: "타일",
    wallpaper: "도배",
    paint: "페인트",
    electric: "전기",
    facility: "설비",
  };
  return map[craft] || "현장";
}

/** @deprecated 베타: 데모 시드 제거 — 빈 배열 유지 */
export const initialSchedules = [];

const LEGACY_PLACEHOLDER_ASSIGNED_WORKERS = new Set(["김준호", "담당자"]);

/** assignedWorker — mock 기본값 제거, 참여자 없으면 빈 문자열 */
export function normalizeAssignedWorker(schedule = {}) {
  const raw = typeof schedule.assignedWorker === "string" ? schedule.assignedWorker.trim() : "";
  if (!raw) return "";
  const hasParticipants =
    (Array.isArray(schedule.scheduleInvites) && schedule.scheduleInvites.filter(Boolean).length > 0) ||
    (Array.isArray(schedule.workerAssignments) && schedule.workerAssignments.filter(Boolean).length > 0);
  if (!hasParticipants && LEGACY_PLACEHOLDER_ASSIGNED_WORKERS.has(raw)) return "";
  return raw;
}

export function isSharedFieldSchedule(s) {
  if (!s || !String(s.briefingId || "").trim()) return false;
  const src = String(s.source || "");
  if (src === "calendar-share" || src === "calendar-share-joined") return true;
  return String(s.scheduleKind || "").toLowerCase() === "shared";
}

export function migrateSchedule(schedule) {
  if (!schedule || typeof schedule !== "object") return schedule;
  const lat = Number(schedule.lat);
  const lng = Number(schedule.lng);
  const settlementStatus =
    schedule.settlementStatus === SCHEDULE_SETTLEMENT_STATUS.SETTLED ||
    schedule.settlementStatus === SCHEDULE_SETTLEMENT_STATUS.REVIEW ||
    schedule.settlementStatus === SCHEDULE_SETTLEMENT_STATUS.WAITING
      ? schedule.settlementStatus
      : SCHEDULE_SETTLEMENT_STATUS.WAITING;
  const shiftType = getDefaultShiftType(schedule);
  const crewCount = Number(schedule.crewCount);
  const settledWorkerCount = Number(schedule.settledWorkerCount);
  const safeCrewCount = Number.isFinite(crewCount) && crewCount > 0 ? Math.round(crewCount) : 1;
  const safeSettledWorkerCount =
    Number.isFinite(settledWorkerCount) && settledWorkerCount >= 0
      ? Math.min(safeCrewCount, Math.round(settledWorkerCount))
      : settlementStatus === SCHEDULE_SETTLEMENT_STATUS.SETTLED
        ? safeCrewCount
        : 0;
  const settlementAmount = calculateScheduleSettlementAmount(schedule);
  const rawBriefingId = schedule.briefingId;
  const briefingId =
    typeof rawBriefingId === "string" && rawBriefingId.trim() ? rawBriefingId.trim() : rawBriefingId != null ? String(rawBriefingId).trim() : null;
  const createdBy = Number(schedule.createdByUserId);
  const acceptedParticipant = Number(schedule.acceptedParticipantUserId);
  const scheduleInvites = Array.isArray(schedule.scheduleInvites)
    ? schedule.scheduleInvites
        .filter(Boolean)
        .map((inv) => ({
          userId: Number(inv.userId),
          name: String(inv.name || "").trim() || "기술자",
          status: String(inv.status || "pending").toLowerCase(),
        }))
        .filter((inv) => Number.isFinite(inv.userId) && inv.userId > 0)
    : [];
  let scheduleKind = schedule.scheduleKind;
  if (scheduleKind !== "shared" && scheduleKind !== "personal" && scheduleKind !== "job") {
    if (schedule.source === "calendar-share" || schedule.source === "calendar-share-joined") {
      scheduleKind = "shared";
    } else if (schedule.source === "personal") {
      scheduleKind = "personal";
    } else if (schedule.jobId != null && schedule.jobId !== "") {
      scheduleKind = "job";
    } else {
      scheduleKind = "personal";
    }
  }
  const workDetails = typeof schedule.workDetails === "string" ? schedule.workDetails.trim() : "";
  const entryInfo = typeof schedule.entryInfo === "string" ? schedule.entryInfo.trim() : "";
  const parkingInfo = typeof schedule.parkingInfo === "string" ? schedule.parkingInfo.trim() : "";
  const durationDays = getScheduleDurationDays(schedule);
  const normalizedEndDate = getScheduleEndDateKey({ ...schedule, durationDays });
  return {
    ...schedule,
    workDate: typeof schedule.workDate === "string" ? schedule.workDate : shiftDateKey(0),
    durationDays,
    endDate: normalizedEndDate,
    workEndDate: normalizedEndDate,
    title: String(schedule.title || "일정").trim() || "일정",
    craft: typeof schedule.craft === "string" ? schedule.craft : "film",
    pay: schedule.pay || "140,000원",
    workTime: schedule.workTime || "08:00~17:00",
    shortRegion: schedule.shortRegion || schedule.shortAddress || schedule.address || "",
    fullAddress: schedule.fullAddress || schedule.address || schedule.shortRegion || "",
    lat: Number.isFinite(lat) ? lat : 36.3504,
    lng: Number.isFinite(lng) ? lng : 127.3845,
    parkingNote: schedule.parkingNote || "주차 가능",
    mealNote: schedule.mealNote || "식대 제공",
    accessPassword: schedule.accessPassword || "",
    requiredItems: schedule.requiredItems || "",
    specialNote: schedule.specialNote || "",
    materialNote: schedule.materialNote || "",
    prepChecklist: Array.isArray(schedule.prepChecklist) ? schedule.prepChecklist.filter(Boolean) : [],
    summaryLines: Array.isArray(schedule.summaryLines) ? schedule.summaryLines.filter(Boolean) : [],
    status: schedule.status || "confirmed",
    canRecruitUrgent: Boolean(schedule.canRecruitUrgent),
    source: schedule.source || "mock",
    sourceJobMatchReady: schedule.sourceJobMatchReady !== false,
    assignedWorker: normalizeAssignedWorker(schedule),
    settlementStatus,
    basePayAmount: getScheduleBasePayAmount(schedule),
    shiftType,
    halfDayRate: getScheduleHalfDayRate(schedule),
    nightWork: shiftType === SCHEDULE_SHIFT_TYPE.NIGHT ? true : Boolean(schedule.nightWork),
    nightAllowanceAmount: getScheduleNightAllowanceAmount(schedule),
    settlementAmount,
    teamName: schedule.teamName || `${CRAFT_LABEL_FALLBACK(schedule.craft)} 팀`,
    siteLabel: schedule.siteLabel || `${schedule.shortRegion || "현장"} ${schedule.title || ""}`.trim(),
    crewCount: safeCrewCount,
    settledWorkerCount: safeSettledWorkerCount,
    partialSettlement:
      typeof schedule.partialSettlement === "boolean"
        ? schedule.partialSettlement
        : settlementStatus === SCHEDULE_SETTLEMENT_STATUS.REVIEW,
    briefingId: briefingId || null,
    createdByUserId: Number.isFinite(createdBy) && createdBy > 0 ? createdBy : null,
    acceptedParticipantUserId: Number.isFinite(acceptedParticipant) && acceptedParticipant > 0 ? acceptedParticipant : null,
    joinedFromScheduleId: typeof schedule.joinedFromScheduleId === "string" ? schedule.joinedFromScheduleId.trim() || null : null,
    scheduleKind,
    workDetails,
    entryInfo: entryInfo || (typeof schedule.accessPassword === "string" ? schedule.accessPassword.trim() : ""),
    parkingInfo: parkingInfo || (typeof schedule.parkingNote === "string" ? schedule.parkingNote.trim() : ""),
    scheduleInvites,
    fieldId: schedule.fieldId || schedule.id || null,
    workerAssignments: (() => {
      const base = {
        ...schedule,
        id: schedule.id,
        workDate: typeof schedule.workDate === "string" ? schedule.workDate : shiftDateKey(0),
        durationDays,
        endDate: normalizedEndDate,
        scheduleInvites,
      };
      if (Array.isArray(schedule.workerAssignments) && schedule.workerAssignments.length) {
        return normalizeWorkerAssignments(base);
      }
      if (schedule.id === "sched-dunsan-film-range" && getScheduleDurationDays(base) > 1) {
        return buildDemoWorkerAssignments(base) || normalizeWorkerAssignments(base);
      }
      return normalizeWorkerAssignments(base);
    })(),
  };
}

export function loadStoredSchedules() {
  try {
    const raw = localStorage.getItem(SCHEDULES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean).map((item) => migrateSchedule(item));
  } catch (_) {
    return [];
  }
}

export function createScheduleFromJobMatch(job, overrides = {}) {
  const normalizedJob = migrateJob(job);
  return migrateSchedule({
    id: overrides.id || `sched-job-${normalizedJob.id}-${Date.now()}`,
    jobId: normalizedJob.id,
    source: "job-match",
    sourceJobMatchReady: true,
    workDate: overrides.workDate || normalizedJob.workDate || shiftDateKey(0),
    durationDays: overrides.durationDays || normalizedJob.durationDays || 1,
    endDate:
      overrides.endDate ||
      normalizedJob.workDateEnd ||
      normalizedJob.endDate ||
      normalizedJob.workEndDate ||
      overrides.workDate ||
      normalizedJob.workDate ||
      "",
    workDateEnd:
      overrides.workDateEnd ||
      normalizedJob.workDateEnd ||
      normalizedJob.endDate ||
      normalizedJob.workEndDate ||
      overrides.endDate ||
      "",
    title:
      overrides.title ||
      String(normalizedJob.title || "").trim() ||
      buildFieldJobTitle(normalizedJob),
    craft: overrides.craft || normalizedJob.craft,
    pay: overrides.pay || normalizedJob.pay,
    workTime: overrides.workTime || normalizedJob.workTime || "08:00~17:00",
    shortRegion: overrides.shortRegion || normalizedJob.shortRegion || normalizedJob.shortAddress || "",
    fullAddress: overrides.fullAddress || normalizedJob.fullAddress || normalizedJob.address || "",
    lat: overrides.lat ?? normalizedJob.lat,
    lng: overrides.lng ?? normalizedJob.lng,
    parkingNote: overrides.parkingNote || "주차 가능",
    mealNote: overrides.mealNote || "식대 제공",
    accessPassword: overrides.accessPassword || normalizedJob.accessPassword || "",
    requiredItems: overrides.requiredItems || normalizedJob.requiredItems || "",
    specialNote: overrides.specialNote || normalizedJob.specialNote || "",
    materialNote: overrides.materialNote || normalizedJob.materialNote || "",
    prepChecklist: Array.isArray(overrides.prepChecklist)
      ? overrides.prepChecklist.filter(Boolean)
      : Array.isArray(normalizedJob.prepChecklist)
        ? normalizedJob.prepChecklist.filter(Boolean)
        : [],
    summaryLines: Array.isArray(overrides.summaryLines)
      ? overrides.summaryLines.filter(Boolean)
      : normalizedJob.memo
        ? [String(normalizedJob.memo).trim()].filter(Boolean)
        : [],
    status: overrides.status || "confirmed",
    canRecruitUrgent: overrides.canRecruitUrgent ?? true,
    assignedWorker: normalizeAssignedWorker(overrides),
    scheduleInvites: Array.isArray(overrides.scheduleInvites) ? overrides.scheduleInvites.filter(Boolean) : [],
    workerAssignments: Array.isArray(overrides.workerAssignments) ? overrides.workerAssignments.filter(Boolean) : [],
    settlementStatus: overrides.settlementStatus || "waiting",
    basePayAmount: overrides.basePayAmount,
    shiftType: overrides.shiftType || getDefaultShiftType(normalizedJob),
    halfDayRate: overrides.halfDayRate,
    nightWork: overrides.nightWork,
    nightAllowanceAmount: overrides.nightAllowanceAmount,
    settlementAmount: overrides.settlementAmount,
    teamName: overrides.teamName || `${CRAFT_LABEL_FALLBACK(normalizedJob.craft)} 팀`,
    siteLabel: overrides.siteLabel || `${normalizedJob.shortRegion || "현장"} ${normalizedJob.siteKind || ""}`.trim(),
    crewCount: overrides.crewCount || normalizedJob.crewCount,
    settledWorkerCount: overrides.settledWorkerCount,
    partialSettlement: Boolean(overrides.partialSettlement),
  });
}
