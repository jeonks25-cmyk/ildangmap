/**
 * 현장 일정 운영 데이터 — 변경 이력·변경 요청·참여자 응답
 */
import { getScheduleEndDateKey } from "./scheduleModel";
import { formatAssignmentPeriod, normalizeWorkerAssignments } from "./workerAssignmentModel";
import { joinWorkTimeParts, parseWorkTimeParts } from "./fieldSiteScheduleParser";
import { emitScheduleChangedNotification } from "../store/useNotificationStore";

const STORAGE_KEY = "ildangmap.scheduleFieldOps.v1";

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { changeHistory: {}, changeRequests: {}, participantResponses: {} };
    const parsed = JSON.parse(raw);
    return {
      changeHistory: parsed.changeHistory || {},
      changeRequests: parsed.changeRequests || {},
      participantResponses: parsed.participantResponses || {},
    };
  } catch (_) {
    return { changeHistory: {}, changeRequests: {}, participantResponses: {} };
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (typeof window !== "undefined") {
      import("../store/useSettlementStore")
        .then(({ useSettlementStore }) => {
          import("../utils/scheduleSyncDiag")
            .then(({ scheduleZeroPutProbe, setScheduleDebounceSource }) => {
              setScheduleDebounceSource("fieldOps.writeAll");
              const st = useSettlementStore.getState();
              scheduleZeroPutProbe("FIELDOPS_WRITE_TRIGGER_SYNC", {
                syncReason: "fieldOps.writeAll",
                debounceSource: "fieldOps.writeAll",
                schedulesLoaded: st.schedulesLoaded,
                scheduleCount: st.schedules?.length ?? 0,
                userId: st.schedulesUserId,
              });
            })
            .catch(() => {
              /* noop */
            });
          useSettlementStore.getState().scheduleSyncDebounced?.("fieldOps.writeAll");
        })
        .catch(() => {
          /* noop */
        });
    }
  } catch (_) {
    /* ignore */
  }
}

export function readAllFieldOps() {
  return readAll();
}

export function writeAllFieldOps(data) {
  writeAll(
    data && typeof data === "object"
      ? data
      : { changeHistory: {}, changeRequests: {}, participantResponses: {} }
  );
}

export function resolveScheduleBriefingId(schedule) {
  const existing = String(schedule?.briefingId || "").trim();
  if (existing) return existing;
  const id = String(schedule?.id || "").trim();
  return id ? `briefing-sched-${id}` : "";
}

export function getScheduleParticipants(schedule) {
  const assignments = normalizeWorkerAssignments(schedule);
  if (assignments.length) {
    return assignments.map((row) => ({
      userId: row.userId,
      name: row.name,
      role: row.role === "owner" ? "owner" : "participant",
      inviteStatus:
        row.status === "confirmed" ? "accepted" : row.status === "declined" ? "declined" : "pending",
      assignmentPeriod: formatAssignmentPeriod(row),
      workDateStart: row.workDateStart,
      workDateEnd: row.workDateEnd,
    }));
  }
  const list = [];
  const ownerId = Number(schedule?.createdByUserId);
  if (Number.isFinite(ownerId) && ownerId > 0) {
    list.push({ userId: ownerId, name: "현장 소장", role: "owner" });
  }
  (Array.isArray(schedule?.scheduleInvites) ? schedule.scheduleInvites : []).forEach((inv) => {
    if (!inv) return;
    const uid = Number(inv.userId);
    if (!Number.isFinite(uid)) return;
    const st = String(inv.status || "").toLowerCase();
    list.push({
      userId: uid,
      name: String(inv.name || "").trim() || "기술자",
      birthYear: Number.isFinite(Number(inv.birthYear)) ? Number(inv.birthYear) : null,
      residence: String(inv.residence || "").trim(),
      role: "participant",
      inviteStatus: st,
    });
  });
  const ap = Number(schedule?.acceptedParticipantUserId);
  if (Number.isFinite(ap) && ap > 0 && !list.some((p) => p.userId === ap)) {
    list.push({ userId: ap, name: "참여 기술자", role: "participant", inviteStatus: "accepted" });
  }
  return list;
}

export function scheduleToEditForm(schedule) {
  if (!schedule) return null;
  const { start, end } = parseWorkTimeParts(schedule.workTime);
  const payRaw = schedule.pay || schedule.basePayAmount || "";
  const payDigits = String(payRaw).replace(/[^0-9]/g, "");
  return {
    title: String(schedule.title || "").trim(),
    fullAddress: String(schedule.fullAddress || schedule.shortRegion || "").trim(),
    workDate: String(schedule.workDate || "").slice(0, 10),
    workDateEnd: getScheduleEndDateKey(schedule) || String(schedule.workDate || "").slice(0, 10),
    startTime: start,
    endTime: end,
    craft: String(schedule.craft || "film"),
    payAmount: payDigits,
    crewCount: Number.isFinite(Number(schedule.crewCount)) ? String(schedule.crewCount) : "1",
    accessPassword: String(schedule.accessPassword || "").trim(),
  };
}

export function editFormToSchedulePatch(form) {
  if (!form) return {};
  const workDate = String(form.workDate || "").trim();
  const workDateEnd = String(form.workDateEnd || workDate).trim() || workDate;
  const startTime = String(form.startTime || "08:00").trim();
  const endTime = String(form.endTime || "17:00").trim();
  const payNum = Number(String(form.payAmount || "").replace(/[^0-9]/g, ""));
  const crew = Number(form.crewCount);
  let durationDays = 1;
  if (workDate && workDateEnd) {
    const s = new Date(`${workDate}T00:00:00`);
    const e = new Date(`${workDateEnd}T00:00:00`);
    if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime()) && e >= s) {
      durationDays = Math.max(1, Math.round((e - s) / 86400000) + 1);
    }
  }
  const shortRegion = String(form.fullAddress || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join(" ");
  return {
    title: String(form.title || "").trim() || "현장",
    fullAddress: String(form.fullAddress || "").trim(),
    shortRegion: shortRegion || String(form.fullAddress || "").trim(),
    workDate,
    endDate: workDateEnd,
    workDateEnd,
    durationDays,
    workTime: joinWorkTimeParts(startTime, endTime),
    craft: String(form.craft || "film"),
    pay: Number.isFinite(payNum) && payNum > 0 ? `${payNum.toLocaleString("ko-KR")}원` : undefined,
    basePayAmount: Number.isFinite(payNum) && payNum > 0 ? payNum : undefined,
    crewCount: Number.isFinite(crew) && crew > 0 ? Math.round(crew) : 1,
    accessPassword: String(form.accessPassword || "").trim(),
  };
}

export function appendScheduleChangeHistory(scheduleId, entry) {
  const data = readAll();
  const key = String(scheduleId);
  const prev = Array.isArray(data.changeHistory[key]) ? data.changeHistory[key] : [];
  data.changeHistory[key] = [{ id: `hist-${Date.now()}`, at: new Date().toISOString(), ...entry }, ...prev].slice(0, 40);
  writeAll(data);
  return data.changeHistory[key];
}

export function listScheduleChangeHistory(scheduleId) {
  const data = readAll();
  return Array.isArray(data.changeHistory[String(scheduleId)]) ? data.changeHistory[String(scheduleId)] : [];
}

export function createScheduleChangeRequest(schedule, { summary, patch, createdBy = "owner" }) {
  const data = readAll();
  const scheduleId = String(schedule?.id || "");
  const requestId = `scr-${Date.now()}`;
  const row = {
    id: requestId,
    scheduleId,
    briefingId: resolveScheduleBriefingId(schedule),
    summary: String(summary || "일정이 변경되었습니다"),
    patch: patch || {},
    createdAt: new Date().toISOString(),
    createdBy,
    status: "pending",
  };
  const prev = Array.isArray(data.changeRequests[scheduleId]) ? data.changeRequests[scheduleId] : [];
  data.changeRequests[scheduleId] = [row, ...prev].slice(0, 20);
  writeAll(data);
  emitScheduleChangedNotification({
    schedule,
    summary: row.summary,
    requestId: row.id,
  });
  return row;
}

export function listScheduleChangeRequests(scheduleId) {
  const data = readAll();
  return Array.isArray(data.changeRequests[String(scheduleId)]) ? data.changeRequests[String(scheduleId)] : [];
}

export function getLatestPendingChangeRequest(scheduleId) {
  return listScheduleChangeRequests(scheduleId).find((r) => r.status === "pending") || null;
}

export function respondToScheduleChangeRequest({ requestId, scheduleId, userId, available }) {
  const data = readAll();
  const sid = String(scheduleId);
  const key = `${sid}:${requestId}:${Number(userId)}`;
  data.participantResponses[key] = {
    requestId,
    scheduleId: sid,
    userId: Number(userId),
    available: Boolean(available),
    respondedAt: new Date().toISOString(),
  };
  writeAll(data);
  return data.participantResponses[key];
}

export function getParticipantResponse(requestId, scheduleId, userId) {
  const data = readAll();
  const key = `${String(scheduleId)}:${requestId}:${Number(userId)}`;
  return data.participantResponses[key] || null;
}

export function countUnavailableForRequest(scheduleId, requestId, participants) {
  const list = Array.isArray(participants) ? participants : [];
  let blocked = 0;
  list.forEach((p) => {
    if (p.role === "owner") return;
    const res = getParticipantResponse(requestId, scheduleId, p.userId);
    if (res && res.available === false) blocked += 1;
  });
  return blocked;
}

export function formatChangeSummary(before, after) {
  const lines = [];
  if (before.title !== after.title) lines.push(`현장명: ${before.title} → ${after.title}`);
  if (before.workDate !== after.workDate || before.workDateEnd !== after.workDateEnd) {
    lines.push(`기간: ${before.workDate}~${before.workDateEnd} → ${after.workDate}~${after.workDateEnd}`);
  }
  if (before.workTime !== after.workTime) lines.push(`시간: ${before.workTime} → ${after.workTime}`);
  if (before.fullAddress !== after.fullAddress) lines.push("주소 변경");
  if (before.craft !== after.craft) lines.push(`공정: ${before.craft} → ${after.craft}`);
  if (before.pay !== after.pay) lines.push(`일당: ${before.pay} → ${after.pay}`);
  if (before.crewCount !== after.crewCount) lines.push(`인원: ${before.crewCount}명 → ${after.crewCount}명`);
  return lines.length ? lines.join("\n") : "일정 정보가 업데이트되었습니다";
}
