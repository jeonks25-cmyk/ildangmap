import { buildFieldJobTitle, getJobCraft, migrateJob } from "./jobModel";
import { initialJobs } from "./jobsStorage";
import { buildDemoWorkerAssignments, normalizeWorkerAssignments } from "./workerAssignmentModel";
import { isBetaSeedMode } from "./betaSeed";
import { BETA_SCHEDULES } from "./betaTestSeed";

export const SCHEDULES_STORAGE_KEY = "calendar_schedules_v1";
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

function defaultSummary(job) {
  const siteKind = String(job?.siteKind || "현장").trim();
  return `${siteKind} ${getJobCraft(job)} 작업`;
}

function createScheduleSeed(rawJob, offsetDays, overrides = {}) {
  const job = migrateJob(rawJob);
  const workDate = overrides.workDate || shiftDateKey(offsetDays);
  const title = overrides.title || buildFieldJobTitle(job);
  return {
    id: overrides.id || `sched-${job.id}-${offsetDays}`,
    jobId: Object.prototype.hasOwnProperty.call(overrides, "jobId") ? overrides.jobId : job.id,
    source: overrides.source || "mock",
    sourceJobMatchReady: overrides.sourceJobMatchReady !== undefined ? overrides.sourceJobMatchReady : true,
    workDate,
    title,
    craft: overrides.craft || job.craft,
    pay: overrides.pay || job.pay,
    workType: overrides.workType || job.workType || "fullDay",
    workTime: overrides.workTime || job.workTime || "08:00~17:00",
    shortRegion: overrides.shortRegion || job.shortRegion || job.shortAddress || "",
    fullAddress: overrides.fullAddress || job.fullAddress || job.address || "",
    lat: Number.isFinite(Number(overrides.lat)) ? Number(overrides.lat) : Number(job.lat),
    lng: Number.isFinite(Number(overrides.lng)) ? Number(overrides.lng) : Number(job.lng),
    parkingNote: overrides.parkingNote || "주차 가능",
    mealNote: overrides.mealNote || "식대 제공",
    accessPassword: overrides.accessPassword || job.accessPassword || "",
    requiredItems: overrides.requiredItems || job.requiredItems || "",
    specialNote: overrides.specialNote || job.specialNote || "",
    materialNote: overrides.materialNote || job.materialNote || "",
    prepChecklist: Array.isArray(overrides.prepChecklist)
      ? overrides.prepChecklist.filter(Boolean)
      : Array.isArray(job.prepChecklist)
        ? job.prepChecklist.filter(Boolean)
        : [],
    summaryLines: overrides.summaryLines || [job.memo || defaultSummary(job), "현장 일정 확정"],
    status: overrides.status || "confirmed",
    canRecruitUrgent: overrides.canRecruitUrgent ?? true,
    assignedWorker: overrides.assignedWorker || "김준호",
    settlementStatus: overrides.settlementStatus || "waiting",
    basePayAmount: overrides.basePayAmount,
    shiftType: overrides.shiftType,
    halfDayRate: overrides.halfDayRate,
    nightWork: overrides.nightWork,
    nightAllowanceAmount: overrides.nightAllowanceAmount,
    settlementAmount: overrides.settlementAmount,
    teamName: overrides.teamName || `${CRAFT_LABEL_FALLBACK(job.craft || job?.craft || "film")} 팀`,
    siteLabel: overrides.siteLabel || `${job.shortRegion || job.shortAddress || "현장"} ${job.siteKind || "현장"}`,
    crewCount: overrides.crewCount,
    settledWorkerCount: overrides.settledWorkerCount,
    partialSettlement: Boolean(overrides.partialSettlement),
    ...(typeof overrides.crewRoleLine === "string" && overrides.crewRoleLine.trim()
      ? { crewRoleLine: overrides.crewRoleLine.trim() }
      : {}),
    ...(typeof overrides.briefingId === "string" && overrides.briefingId.trim()
      ? {
          briefingId: overrides.briefingId.trim(),
          scheduleKind: overrides.scheduleKind || "shared",
          createdByUserId: Number.isFinite(Number(overrides.createdByUserId)) ? Number(overrides.createdByUserId) : null,
          acceptedParticipantUserId: Number.isFinite(Number(overrides.acceptedParticipantUserId))
            ? Number(overrides.acceptedParticipantUserId)
            : null,
        }
      : {}),
    ...(Number.isFinite(Number(overrides.createdByUserId)) && Number(overrides.createdByUserId) > 0
      ? { createdByUserId: Number(overrides.createdByUserId) }
      : {}),
    ...(Array.isArray(overrides.scheduleInvites) ? { scheduleInvites: overrides.scheduleInvites } : {}),
  };
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

function shiftDateKeyFrom(baseKey, offsetDays) {
  return addDaysToDateKey(baseKey, offsetDays);
}

const DEMO_RANGE_START = shiftDateKey(0);

export const initialSchedules = [
  createScheduleSeed(initialJobs[0], 0, {
    id: "sched-dunsan-film-range",
    fieldId: "field-dunsan-film",
    title: "둔산필름",
    workDate: DEMO_RANGE_START,
    durationDays: 8,
    endDate: shiftDateKeyFrom(DEMO_RANGE_START, 7),
    workDateEnd: shiftDateKeyFrom(DEMO_RANGE_START, 7),
    workTime: "08:30~17:00",
    fullAddress: "대전 서구 둔산남로 92",
    shortRegion: "대전 서구 둔산동",
    crewRoleLine: "기공 2명 · 조공 1명",
    parkingNote: "지하주차장 B2 우선",
    mealNote: "점심 12:10 도시락",
    summaryLines: ["입구 2번 게이트 집결", "LX 필름 화이트 계열"],
    settlementStatus: "waiting",
    teamName: "둔산 필름팀",
    siteLabel: "둔산동 상가 현장",
    crewCount: 3,
    settledWorkerCount: 1,
    createdByUserId: 1,
    partialSettlement: false,
    scheduleInvites: [{ userId: 102, name: "박조공", status: "pending" }],
  }),
  createScheduleSeed(initialJobs[1], 0, {
    id: "sched-shared-field-demo",
    jobId: null,
    briefingId: "br-demo-shared-calendar",
    source: "calendar-share",
    scheduleKind: "shared",
    sourceJobMatchReady: false,
    createdByUserId: 1,
    title: "유성 궁동 상가 · 오후 공유 차수",
    workTime: "13:00~18:00",
    shortRegion: "대전 유성구 궁동",
    fullAddress: "대전 유성구 봉명대로 168 상가 3층",
    craft: "paint",
    pay: "170,000원",
    summaryLines: ["팀 공유 일정 · 운영 기록으로만 소통", "도장 마감 2차"],
    canRecruitUrgent: false,
    settlementStatus: "waiting",
    teamName: "궁동 도장팀",
    siteLabel: "유성 궁동 상가",
    crewCount: 3,
    settledWorkerCount: 0,
  }),
  createScheduleSeed(initialJobs[4], 0, {
    workTime: "20:00~04:00",
    parkingNote: "건물 뒤 주차 가능",
    mealNote: "점심 제공",
    summaryLines: ["야간 전기 배선 보강", "야간수당 자동 반영"],
    settlementStatus: "waiting",
    shiftType: "night",
    nightWork: true,
    nightAllowanceAmount: 30000,
    basePayAmount: 220000,
    teamName: "탄방 전기팀",
    siteLabel: "탄방동 상가 현장",
    crewCount: 4,
    settledWorkerCount: 1,
    partialSettlement: true,
  }),
  createScheduleSeed(initialJobs[2], 1, {
    mealNote: "식대 협의",
    summaryLines: ["타일 줄눈·보조 작업", "장기 현장으로 연장 가능"],
    settlementStatus: "review",
    shiftType: "half",
    basePayAmount: 160000,
    halfDayRate: 0.6,
    teamName: "용운 타일팀",
    siteLabel: "용운동 아파트 현장",
    crewCount: 2,
    settledWorkerCount: 0,
    partialSettlement: true,
  }),
  createScheduleSeed(initialJobs[3], 2, {
    parkingNote: "기계식 주차",
    mealNote: "식대 제공",
    canRecruitUrgent: false,
    summaryLines: ["오피스텔 도배 감리", "오야지 일정 · 현장 점검"],
    settlementStatus: "settled",
    teamName: "은행 도배팀",
    siteLabel: "은행동 오피스텔 현장",
    crewCount: 2,
    settledWorkerCount: 2,
  }),
  createScheduleSeed(initialJobs[6], 4, {
    workTime: "08:30~13:00",
    parkingNote: "주차 문의",
    mealNote: "간식 제공",
    summaryLines: ["학원 도배 준공 정리", "오전 일정으로 짧게 진행"],
    settlementStatus: "waiting",
    shiftType: "half",
    basePayAmount: 150000,
    halfDayRate: 0.6,
    teamName: "봉명 도배팀",
    siteLabel: "봉명동 학원 현장",
    crewCount: 2,
    settledWorkerCount: 0,
  }),
  createScheduleSeed(initialJobs[5], 7, {
    parkingNote: "현장 입구 주차 가능",
    mealNote: "식대 제공",
    summaryLines: ["신축 설비 배관 작업", "오후 공정 점검 포함"],
    settlementStatus: "settled",
    teamName: "관저 설비팀",
    siteLabel: "관저동 신축 현장",
    crewCount: 3,
    settledWorkerCount: 3,
  }),
  createScheduleSeed(initialJobs[1], 5, {
    shortRegion: "세종 나성동",
    fullAddress: "세종특별자치시 나성북로 30 상가",
    pay: "170,000원",
    mealNote: "식대 제공",
    summaryLines: ["세종 상가 도장 마감", "오후 정산 예정"],
    settlementStatus: "waiting",
    teamName: "세종 도장팀",
    siteLabel: "세종 나성동 상가",
    crewCount: 3,
    settledWorkerCount: 1,
    partialSettlement: true,
  }),
  createScheduleSeed(initialJobs[0], 20, {
    shortRegion: "대전 서구 월평동",
    fullAddress: "대전 서구 월평중로 58 상가",
    pay: "150,000원",
    summaryLines: ["월평동 상가 필름 시공", "다음달 초 예정 일정"],
    settlementStatus: "waiting",
    teamName: "월평 필름팀",
    siteLabel: "월평동 상가 현장",
    crewCount: 3,
    settledWorkerCount: 0,
  }),
  createScheduleSeed(initialJobs[2], 24, {
    shortRegion: "세종 보람동",
    fullAddress: "세종특별자치시 보람로 66",
    pay: "160,000원",
    summaryLines: ["세종 타일 보조", "준기공 일정 확정"],
    settlementStatus: "waiting",
    shiftType: "half",
    basePayAmount: 180000,
    halfDayRate: 0.65,
    teamName: "보람 타일팀",
    siteLabel: "세종 보람동 아파트",
    crewCount: 2,
    settledWorkerCount: 0,
  }),
  createScheduleSeed(initialJobs[5], 29, {
    shortRegion: "대전 유성구 상대동",
    fullAddress: "대전 유성구 상대서로 20 신축 현장",
    pay: "175,000원",
    summaryLines: ["상대동 설비 배관", "다음달 예정 수익 반영"],
    settlementStatus: "waiting",
    shiftType: "night",
    nightWork: true,
    nightAllowanceAmount: 20000,
    basePayAmount: 175000,
    teamName: "상대 설비팀",
    siteLabel: "상대동 신축 현장",
    crewCount: 4,
    settledWorkerCount: 0,
  }),
  createScheduleSeed(initialJobs[4], 2, {
    id: "sched-urgent-help-demo",
    title: "긴급헬프 · 도배 보조",
    workTime: "10:00~13:00",
    summaryLines: ["2~3시간 즉시 투입", "현장 소장 호출"],
    settlementStatus: "waiting",
    teamName: "긴급 헬프",
    siteLabel: "은행동 오피스텔",
    crewCount: 2,
    settledWorkerCount: 0,
  }),
  createScheduleSeed(initialJobs[2], 2, {
    id: "sched-estimate-visit",
    title: "견적 방문 · 용운 타일",
    source: "estimate-visit",
    sourceJobMatchReady: true,
    workTime: "14:00~15:30",
    summaryLines: ["실측·견적서 전달", "자재 샘플 휴대"],
    settlementStatus: "waiting",
    teamName: "견적 방문",
    siteLabel: "용운동 현장",
    crewCount: 1,
    settledWorkerCount: 0,
  }),
  createScheduleSeed(initialJobs[3], 2, {
    id: "sched-settlement-reminder",
    title: "정산 입금 확인",
    source: "settlement",
    sourceJobMatchReady: true,
    workTime: "18:00~18:20",
    summaryLines: ["당일 정산 확인", "계좌 이체"],
    settlementStatus: "waiting",
    teamName: "정산",
    siteLabel: "노은동 아파트",
    crewCount: 2,
    settledWorkerCount: 1,
    partialSettlement: true,
  }),
  createScheduleSeed(initialJobs[0], 10, {
    id: "sched-holiday-personal",
    jobId: null,
    source: "personal",
    sourceJobMatchReady: false,
    title: "어린이날 · 가족일정",
    workTime: "09:00~12:00",
    shortRegion: "가족",
    fullAddress: "",
    summaryLines: ["현장 휴무", "개인 캘린더"],
    canRecruitUrgent: false,
    settlementStatus: "waiting",
    teamName: "개인",
    siteLabel: "개인",
    crewCount: 1,
    settledWorkerCount: 0,
  }),
  createScheduleSeed(initialJobs[0], 10, {
    id: "sched-half-day-personal",
    jobId: null,
    source: "personal",
    sourceJobMatchReady: false,
    title: "반차 (오후)",
    workTime: "13:00~18:00",
    shortRegion: "대전",
    fullAddress: "",
    summaryLines: ["오전만 현장", "개인 일정"],
    canRecruitUrgent: false,
    settlementStatus: "waiting",
    teamName: "개인",
    siteLabel: "개인",
    crewCount: 1,
    settledWorkerCount: 0,
  }),
  createScheduleSeed(initialJobs[0], 10, {
    id: "sched-equipment-move",
    jobId: 1,
    source: "mock",
    title: "장비 이동 · 둔산",
    workTime: "07:30~08:20",
    summaryLines: ["사다리·필름재단기", "현장 반입"],
    settlementStatus: "waiting",
    teamName: "둔산 필름팀",
    siteLabel: "둔산동 상가",
    crewCount: 3,
    settledWorkerCount: 1,
    partialSettlement: false,
  }),
  createScheduleSeed(initialJobs[0], 0, {
    id: "sched-personal-demo",
    jobId: null,
    source: "personal",
    sourceJobMatchReady: false,
    title: "건강검진 · 행정(개인)",
    workTime: "11:30~12:30",
    shortRegion: "대전 서구 둔산동",
    fullAddress: "대전 서구 둔산대로 인근",
    summaryLines: ["병원 예약 · 연결된 현장과 무관"],
    canRecruitUrgent: false,
    settlementStatus: "waiting",
    teamName: "개인",
    siteLabel: "개인 메모",
    crewCount: 1,
    settledWorkerCount: 0,
  }),
];

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
    assignedWorker: schedule.assignedWorker || "김준호",
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
  const fallback = (isBetaSeedMode() ? BETA_SCHEDULES : initialSchedules).map(migrateSchedule);
  try {
    const raw = localStorage.getItem(SCHEDULES_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    const seedById = new Map(fallback.map((item) => [item?.id, item]));
    const stored = parsed
      .filter(Boolean)
      .map((item) => {
        const seed = item?.id ? seedById.get(item.id) : null;
        if (seed?.id) seedById.delete(seed.id);
        return migrateSchedule({
          ...(seed || {}),
          ...item,
        });
      });
    const existingIds = new Set(stored.map((item) => item?.id).filter(Boolean));
    const missingDefaults = fallback.filter((item) => item?.id && !existingIds.has(item.id));
    return [...stored, ...missingDefaults];
  } catch (_) {
    return fallback;
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
    title: overrides.title || buildFieldJobTitle(normalizedJob),
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
    summaryLines: overrides.summaryLines || [normalizedJob.memo || "연결된 현장 일정"],
    status: overrides.status || "confirmed",
    canRecruitUrgent: overrides.canRecruitUrgent ?? true,
    assignedWorker: overrides.assignedWorker || "김준호",
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
