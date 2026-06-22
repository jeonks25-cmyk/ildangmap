/** 일정 저장·조회 동기화 진단 — [SCHEDULE-DIAG] 접두사로 필터 */
export function scheduleDiag(step, detail) {
  if (detail !== undefined) {
    console.log(`[SCHEDULE-DIAG] ${step}`, detail);
  } else {
    console.log(`[SCHEDULE-DIAG] ${step}`);
  }
}

export function scheduleDiagSaveResult(schedule) {
  if (!schedule) {
    scheduleDiag("save — no schedule");
    return;
  }
  const memberIds = [
    ...(Array.isArray(schedule.scheduleInvites) ? schedule.scheduleInvites.map((iv) => iv?.userId) : []),
    ...(Array.isArray(schedule.workerAssignments) ? schedule.workerAssignments.map((w) => w?.userId) : []),
  ].filter((id) => id != null && id !== "");

  scheduleDiag("save result", {
    scheduleId: schedule.id,
    ownerId: schedule.createdByUserId ?? null,
    memberIds: [...new Set(memberIds.map(String))],
    workDate: schedule.workDate,
    title: schedule.title,
  });
}

export function scheduleDiagCalendarLoad({
  userId,
  schedulesUserId,
  schedulesLoaded,
  selectedDateKey,
  totalSchedules,
  dayEntryCount,
  siteCount,
  personalCount,
}) {
  scheduleDiag("calendar load", {
    userId: userId != null ? String(userId) : null,
    schedulesUserId: schedulesUserId != null ? String(schedulesUserId) : null,
    schedulesLoaded: Boolean(schedulesLoaded),
    selectedDateKey,
    totalSchedules,
    dayEntryCount,
    siteCount,
    personalCount,
  });
}
