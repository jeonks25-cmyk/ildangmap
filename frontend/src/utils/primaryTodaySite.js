import { canAccessJobBriefing } from "./jobModel";
import { isSharedFieldSchedule } from "./scheduleModel";
import { isDemoMode } from "./demoMode";

export function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function compareDateKeys(a, b) {
  return String(a || "").localeCompare(String(b || ""));
}

export function parseTimeRange(value) {
  const match = String(value || "").match(/(\d{1,2}):(\d{2})\s*~\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const [, sh, sm, eh, em] = match;
  return {
    start: Number(sh) * 60 + Number(sm),
    end: Number(eh) * 60 + Number(em),
  };
}

export function buildJobById(jobList) {
  const m = new Map();
  for (const j of Array.isArray(jobList) ? jobList : []) {
    if (j?.id != null) m.set(Number(j.id), j);
  }
  return m;
}

export function getBriefingHrefForSchedule(schedule, jobById) {
  if (!schedule) return null;
  if (String(schedule.briefingId || "").trim()) {
    return `/briefing-room/${encodeURIComponent(String(schedule.briefingId))}`;
  }
  const jid = schedule.jobId == null ? NaN : Number(schedule.jobId);
  if (Number.isFinite(jid) && jobById.has(jid)) return `/jobs/${jid}/briefing`;
  return null;
}

/**
 * @returns {{
 *  jobById: Map<number, object>,
 *  linkedJobSchedulesAhead: object[],
 *  myTodaySites: object[],
 *  myFutureSites: object[],
 *  mySharedSchedulesAhead: object[],
 *  myTodaySharedSites: object[],
 *  myTodayAllRows: { kind: string, schedule: object, job: object | null }[],
 *  primaryTodayRow: { kind: string, schedule: object, job: object | null } | null
 * }}
 */
export function computeTodaySiteContext({ scheduleList, jobList, viewerApplicantUserId, todayKey }) {
  const jobById = buildJobById(jobList);
  const list = Array.isArray(scheduleList) ? scheduleList : [];
  const demoMode = isDemoMode();
  const uid = viewerApplicantUserId;

  const isMyLinkedSite = (s) => {
    const jid = s?.jobId == null ? NaN : Number(s.jobId);
    const job = Number.isFinite(jid) ? jobById.get(jid) : null;
    if (!job) return false;
    if (demoMode) return true;
    return canAccessJobBriefing(job, uid);
  };

  const linkedJobSchedulesAhead = list
    .filter((s) => {
      if (!s || !s.workDate) return false;
      const jid = s.jobId == null ? NaN : Number(s.jobId);
      if (!Number.isFinite(jid) || !jobById.has(jid)) return false;
      return compareDateKeys(s.workDate, todayKey) >= 0;
    })
    .sort((a, b) => {
      const c = compareDateKeys(a.workDate, b.workDate);
      if (c !== 0) return c;
      const ta = parseTimeRange(a.workTime)?.start ?? 8 * 60;
      const tb = parseTimeRange(b.workTime)?.start ?? 8 * 60;
      return ta - tb;
    })
    .slice(0, 24);

  const myTodaySites = linkedJobSchedulesAhead.filter((s) => s.workDate === todayKey && isMyLinkedSite(s));
  const myFutureSites = linkedJobSchedulesAhead.filter((s) => compareDateKeys(s.workDate, todayKey) > 0 && isMyLinkedSite(s));

  const mySharedSchedulesAhead = demoMode
    ? list
        .filter((s) => {
          if (!s || !s.workDate) return false;
          if (!isSharedFieldSchedule(s)) return false;
          return compareDateKeys(s.workDate, todayKey) >= 0;
        })
        .sort((a, b) => {
          const c = compareDateKeys(a.workDate, b.workDate);
          if (c !== 0) return c;
          const ta = parseTimeRange(a.workTime)?.start ?? 8 * 60;
          const tb = parseTimeRange(b.workTime)?.start ?? 8 * 60;
          return ta - tb;
        })
        .slice(0, 16)
    : uid == null
      ? []
      : list
          .filter((s) => {
            if (!s || !s.workDate) return false;
            if (!isSharedFieldSchedule(s)) return false;
            if (compareDateKeys(s.workDate, todayKey) < 0) return false;
            if (Number(s.createdByUserId) === Number(uid)) return true;
            if (Number(s.acceptedParticipantUserId) === Number(uid)) return true;
            return false;
          })
          .sort((a, b) => {
            const c = compareDateKeys(a.workDate, b.workDate);
            if (c !== 0) return c;
            const ta = parseTimeRange(a.workTime)?.start ?? 8 * 60;
            const tb = parseTimeRange(b.workTime)?.start ?? 8 * 60;
            return ta - tb;
          })
          .slice(0, 16);

  const myTodaySharedSites = mySharedSchedulesAhead.filter((s) => s.workDate === todayKey);

  const jobRows = myTodaySites.map((s) => ({ kind: "job", schedule: s, job: jobById.get(Number(s.jobId)) }));
  const shareRows = myTodaySharedSites.map((s) => ({ kind: "shared", schedule: s, job: null }));
  const myTodayAllRows = [...jobRows, ...shareRows].sort(
    (a, b) => (parseTimeRange(a.schedule.workTime)?.start ?? 999) - (parseTimeRange(b.schedule.workTime)?.start ?? 999)
  );

  const primaryTodayRow = myTodayAllRows[0] || null;

  return {
    jobById,
    linkedJobSchedulesAhead,
    myTodaySites,
    myFutureSites,
    mySharedSchedulesAhead,
    myTodaySharedSites,
    myTodayAllRows,
    primaryTodayRow,
  };
}
