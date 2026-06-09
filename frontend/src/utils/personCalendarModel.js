import { getScheduleDateKeys } from "./scheduleModel";

export const DAY_DEPLOY_STATUS = {
  available: "available",
  busy: "busy",
  invited: "invited",
};

/**
 * 내가 만든 현장 일정 중 해당 인원을 초대·배정한 날짜 키.
 * 오야지가 인력 캘린더에서 "◎ 내 현장"을 구분하기 위함.
 */
export function getMyInvitedFieldDateKeysForContact({ viewerUserId, contactUserId, schedules = [] } = {}) {
  const keys = new Set();
  const viewerId = Number(viewerUserId);
  const personId = Number(contactUserId);
  if (!Number.isFinite(viewerId) || viewerId <= 0 || !Number.isFinite(personId) || personId <= 0) {
    return keys;
  }

  (Array.isArray(schedules) ? schedules : []).forEach((schedule) => {
    if (!schedule) return;
    const createdBy = Number(schedule.createdByUserId);
    if (!Number.isFinite(createdBy) || createdBy !== viewerId) return;

    const invites = Array.isArray(schedule.scheduleInvites) ? schedule.scheduleInvites : [];
    const assignments = Array.isArray(schedule.workerAssignments) ? schedule.workerAssignments : [];
    const onMyField =
      invites.some((inv) => Number(inv?.userId) === personId) ||
      assignments.some((row) => Number(row?.userId) === personId);
    if (!onMyField) return;

    getScheduleDateKeys(schedule).forEach((key) => {
      if (key) keys.add(key);
    });
  });

  return keys;
}

/** ○ 가능 / ● 일정 있음 / ◎ 내 현장 */
export function resolvePersonDayDeployStatus({
  dateKey,
  availMap,
  personalEvents,
  fieldDateKeys,
  myFieldDateKeys,
  dayStatusUnavailable = "unavailable",
}) {
  if (myFieldDateKeys instanceof Set && myFieldDateKeys.has(dateKey)) {
    return DAY_DEPLOY_STATUS.invited;
  }

  const raw = availMap?.[dateKey];
  if (raw === dayStatusUnavailable) return DAY_DEPLOY_STATUS.busy;
  if (Array.isArray(personalEvents) && personalEvents.some((e) => e.dateKey === dateKey)) {
    return DAY_DEPLOY_STATUS.busy;
  }
  if (fieldDateKeys instanceof Set && fieldDateKeys.has(dateKey)) return DAY_DEPLOY_STATUS.busy;

  return DAY_DEPLOY_STATUS.available;
}

export function personDayDeployStatusLabel(status) {
  if (status === DAY_DEPLOY_STATUS.invited) return "내 현장";
  if (status === DAY_DEPLOY_STATUS.busy) return "일정 있음";
  return "가능";
}
