/**
 * 현장 기간 + 인원 배정 모델
 * Field(현장) ↔ Schedule(기간) ↔ WorkerAssignment(인원·날짜범위)
 */
import { addDaysToDateKey, getScheduleDateKeys, getScheduleEndDateKey } from "./scheduleModel";

export const ASSIGNMENT_STATUS = {
  pending: "pending",
  confirmed: "confirmed",
  declined: "declined",
};

export const ASSIGNMENT_ROLE = {
  owner: "owner",
  participant: "participant",
};

function parseDateKey(value) {
  const key = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : "";
}

/** 단일 인원 배정 — schedule 전체가 아닌 날짜 범위 지정 가능 */
export function createWorkerAssignment({
  id,
  scheduleId,
  fieldId = null,
  userId,
  name,
  workDateStart,
  workDateEnd,
  role = ASSIGNMENT_ROLE.participant,
  status = ASSIGNMENT_STATUS.pending,
}) {
  const start = parseDateKey(workDateStart);
  const end = parseDateKey(workDateEnd) || start;
  const uid = Number(userId);
  if (!start || !Number.isFinite(uid) || uid <= 0) return null;
  const safeEnd = end >= start ? end : start;
  return {
    id: id || `wa-${scheduleId || "sched"}-${uid}-${start}`,
    scheduleId: scheduleId || null,
    fieldId: fieldId || scheduleId || null,
    userId: uid,
    name: String(name || "").trim() || "기술자",
    workDateStart: start,
    workDateEnd: safeEnd,
    role,
    status: String(status || ASSIGNMENT_STATUS.pending).toLowerCase(),
    updatedAt: new Date().toISOString(),
  };
}

/** scheduleInvites → workerAssignments 마이그레이션 (기간 = 현장 전체) */
export function assignmentsFromScheduleInvites(schedule) {
  if (!schedule) return [];
  const start = parseDateKey(schedule.workDate);
  const end = getScheduleEndDateKey(schedule) || start;
  const list = [];
  const ownerId = Number(schedule.createdByUserId);
  if (Number.isFinite(ownerId) && ownerId > 0) {
    const owner = createWorkerAssignment({
      scheduleId: schedule.id,
      fieldId: schedule.fieldId || schedule.id,
      userId: ownerId,
      name: "현장 소장",
      workDateStart: start,
      workDateEnd: end,
      role: ASSIGNMENT_ROLE.owner,
      status: ASSIGNMENT_STATUS.confirmed,
    });
    if (owner) list.push(owner);
  }
  (Array.isArray(schedule.scheduleInvites) ? schedule.scheduleInvites : []).forEach((inv) => {
    const row = createWorkerAssignment({
      scheduleId: schedule.id,
      fieldId: schedule.fieldId || schedule.id,
      userId: inv.userId,
      name: inv.name,
      workDateStart: start,
      workDateEnd: end,
      role: ASSIGNMENT_ROLE.participant,
      status: inv.status === "accepted" ? ASSIGNMENT_STATUS.confirmed : inv.status === "declined" ? ASSIGNMENT_STATUS.declined : ASSIGNMENT_STATUS.pending,
    });
    if (row) list.push(row);
  });
  return list;
}

/** schedule.workerAssignments 정규화 — 없으면 invites에서 생성 */
export function normalizeWorkerAssignments(schedule) {
  if (!schedule) return [];
  const existing = Array.isArray(schedule.workerAssignments) ? schedule.workerAssignments.filter(Boolean) : [];
  if (existing.length) {
    return existing
      .map((row) =>
        createWorkerAssignment({
          ...row,
          scheduleId: row.scheduleId || schedule.id,
          fieldId: row.fieldId || schedule.fieldId || schedule.id,
        })
      )
      .filter(Boolean);
  }
  return assignmentsFromScheduleInvites(schedule);
}

export function assignmentCoversDate(assignment, dateKey) {
  if (!assignment || !dateKey) return false;
  const start = parseDateKey(assignment.workDateStart);
  const end = parseDateKey(assignment.workDateEnd) || start;
  return dateKey >= start && dateKey <= end;
}

/** 날짜별 팀원 배정 현황 — { dateKey, label, workers[] }[] */
export function buildDailyWorkerRoster(schedule, assignments) {
  const dateKeys = getScheduleDateKeys(schedule);
  const rows = normalizeWorkerAssignments(schedule);
  const source = assignments?.length ? assignments : rows;
  const active = source.filter(
    (a) => a.status === ASSIGNMENT_STATUS.confirmed || a.status === ASSIGNMENT_STATUS.pending || a.role === ASSIGNMENT_ROLE.owner
  );

  return dateKeys.map((dateKey) => {
    const workers = active
      .filter((a) => assignmentCoversDate(a, dateKey))
      .map((a) => ({
        userId: a.userId,
        name: a.name,
        role: a.role,
        status: a.status,
        periodLabel: formatAssignmentPeriod(a),
      }));
    return {
      dateKey,
      dateLabel: formatDateKeyLabel(dateKey),
      workers,
    };
  });
}

export function formatAssignmentPeriod(assignment) {
  const start = parseDateKey(assignment?.workDateStart);
  const end = parseDateKey(assignment?.workDateEnd) || start;
  if (!start) return "";
  if (start === end) return formatDateKeyShort(start);
  return `${formatDateKeyShort(start)} ~ ${formatDateKeyShort(end)}`;
}

export function formatDateKeyShort(dateKey) {
  const key = parseDateKey(dateKey);
  if (!key) return "";
  const [, m, d] = key.split("-");
  return `${Number(m)}월${Number(d)}일`;
}

export function formatDateKeyLabel(dateKey) {
  const key = parseDateKey(dateKey);
  if (!key) return "";
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return `${m}월${d}일 (${weekdays[date.getDay()]})`;
}

export function formatSchedulePeriodLabel(schedule) {
  const start = parseDateKey(schedule?.workDate);
  const end = getScheduleEndDateKey(schedule) || start;
  if (!start) return "—";
  if (start === end) return formatDateKeyShort(start);
  return `${formatDateKeyShort(start)} ~ ${formatDateKeyShort(end)}`;
}

/** composer 선택 목록과 scheduleInvites·workerAssignments 동기화 (owner 유지, 해제 반영) */
export function syncScheduleParticipantSelection(schedule, selectedInvitees = []) {
  if (!schedule) {
    return { scheduleInvites: [], workerAssignments: [] };
  }

  const ownerId = Number(schedule.createdByUserId);
  const existingInvites = Array.isArray(schedule.scheduleInvites) ? schedule.scheduleInvites : [];
  const existingByUserId = new Map(
    existingInvites
      .filter((iv) => iv && Number.isFinite(Number(iv.userId)))
      .map((iv) => [Number(iv.userId), iv])
  );
  const existingAssignments = normalizeWorkerAssignments(schedule);
  const assignmentByUserId = new Map(
    existingAssignments
      .filter((row) => row.role !== ASSIGNMENT_ROLE.owner)
      .map((row) => [row.userId, row])
  );

  const scheduleInvites = (Array.isArray(selectedInvitees) ? selectedInvitees : [])
    .filter((iv) => iv && Number.isFinite(Number(iv.userId)) && Number(iv.userId) > 0)
    .map((iv) => {
      const uid = Number(iv.userId);
      const prev = existingByUserId.get(uid);
      return {
        userId: uid,
        name: String(iv.name || prev?.name || "").trim() || "기술자",
        birthYear: Number.isFinite(Number(iv.birthYear)) ? Number(iv.birthYear) : prev?.birthYear ?? null,
        residence: String(iv.residence || prev?.residence || "").trim(),
        status: prev?.status || "pending",
      };
    });

  const start = parseDateKey(schedule.workDate);
  const end = getScheduleEndDateKey(schedule) || start;
  const workerAssignments = [];

  const ownerAssignment =
    existingAssignments.find(
      (row) => row.role === ASSIGNMENT_ROLE.owner || (Number.isFinite(ownerId) && row.userId === ownerId)
    ) ||
    (Number.isFinite(ownerId) && ownerId > 0
      ? createWorkerAssignment({
          scheduleId: schedule.id,
          fieldId: schedule.fieldId || schedule.id,
          userId: ownerId,
          name: "현장 소장",
          workDateStart: start,
          workDateEnd: end,
          role: ASSIGNMENT_ROLE.owner,
          status: ASSIGNMENT_STATUS.confirmed,
        })
      : null);
  if (ownerAssignment) workerAssignments.push(ownerAssignment);

  scheduleInvites.forEach((inv) => {
    const prev = assignmentByUserId.get(Number(inv.userId));
    if (prev) {
      workerAssignments.push(prev);
      return;
    }
    const row = createWorkerAssignment({
      scheduleId: schedule.id,
      fieldId: schedule.fieldId || schedule.id,
      userId: inv.userId,
      name: inv.name,
      workDateStart: start,
      workDateEnd: end,
      role: ASSIGNMENT_ROLE.participant,
      status:
        inv.status === "accepted"
          ? ASSIGNMENT_STATUS.confirmed
          : inv.status === "declined"
            ? ASSIGNMENT_STATUS.declined
            : ASSIGNMENT_STATUS.pending,
    });
    if (row) workerAssignments.push(row);
  });

  return { scheduleInvites, workerAssignments };
}

/** 초대 시 배정 행 추가 (기본: 현장 전체 기간) */
export function mergeWorkerAssignmentsForInvite(schedule, invitees, { workDateStart, workDateEnd } = {}) {
  const existing = normalizeWorkerAssignments(schedule);
  const existingIds = new Set(existing.map((a) => a.userId));
  const start = parseDateKey(workDateStart) || parseDateKey(schedule?.workDate);
  const end = parseDateKey(workDateEnd) || getScheduleEndDateKey(schedule) || start;
  const added = (Array.isArray(invitees) ? invitees : [])
    .filter((iv) => iv && Number.isFinite(Number(iv.userId)) && !existingIds.has(Number(iv.userId)))
    .map((iv) =>
      createWorkerAssignment({
        scheduleId: schedule.id,
        fieldId: schedule.fieldId || schedule.id,
        userId: iv.userId,
        name: iv.name,
        workDateStart: start,
        workDateEnd: end,
        status: ASSIGNMENT_STATUS.pending,
      })
    )
    .filter(Boolean);
  return [...existing, ...added];
}

/** 데모용 — 기간 현장 + 날짜별 다른 인원 */
export function buildDemoWorkerAssignments(schedule) {
  const start = parseDateKey(schedule.workDate);
  const end = getScheduleEndDateKey(schedule) || start;
  if (!start || start === end) return null;
  const scheduleId = schedule.id;
  const fieldId = schedule.fieldId || scheduleId;
  const ownerId = Number(schedule.createdByUserId) || 1;
  return [
    createWorkerAssignment({
      scheduleId,
      fieldId,
      userId: ownerId,
      name: "현장 소장",
      workDateStart: start,
      workDateEnd: end,
      role: ASSIGNMENT_ROLE.owner,
      status: ASSIGNMENT_STATUS.confirmed,
    }),
    createWorkerAssignment({
      scheduleId,
      fieldId,
      userId: 101,
      name: "김기공",
      workDateStart: start,
      workDateEnd: addDaysToDateKey(start, 2),
      role: ASSIGNMENT_ROLE.participant,
      status: ASSIGNMENT_STATUS.confirmed,
    }),
    createWorkerAssignment({
      scheduleId,
      fieldId,
      userId: 102,
      name: "박조공",
      workDateStart: addDaysToDateKey(start, 3),
      workDateEnd: addDaysToDateKey(start, 5),
      role: ASSIGNMENT_ROLE.participant,
      status: ASSIGNMENT_STATUS.confirmed,
    }),
    createWorkerAssignment({
      scheduleId,
      fieldId,
      userId: 103,
      name: "이조공",
      workDateStart: addDaysToDateKey(start, 6),
      workDateEnd: end,
      role: ASSIGNMENT_ROLE.participant,
      status: ASSIGNMENT_STATUS.confirmed,
    }),
  ].filter(Boolean);
}
