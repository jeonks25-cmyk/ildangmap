/**
 * MVP 데모 — 오야지 주간에 현실적인 현장 배치 (날짜·부족·오전/오후)
 */
import { toDateKey } from "./fieldScheduleModel";
import { JOB_STATUS, migrateJob } from "./jobModel";

/** 기본 지역 필터(대전 서구)와 맞추기 위한 주소 접두 */
const DEMO_REGION = "대전 서구";

/** 시드 기준 앵커 (initialJobsSeed 설계일) */
const DEMO_ANCHOR_DATE = "2026-05-20";

const OYAJI_DEMO_LAYOUT = [
  {
    id: 1,
    dayOffset: 0,
    patch: {
      address: `${DEMO_REGION} 둔산동`,
      isUrgent: true,
      shortageCount: 2,
      status: "recruiting",
      workType: "morning",
      workTime: "08:30~17:00",
      title: "둔산 ○○상가 필름 시공",
    },
  },
  {
    id: 2,
    dayOffset: 0,
    patch: {
      address: `${DEMO_REGION} 탄방동`,
      status: JOB_STATUS.WORKING,
      shortageCount: 1,
      workType: "morning",
      workTime: "07:30~12:00",
      activeWorkersCount: 3,
    },
  },
  {
    id: 3,
    dayOffset: 0,
    patch: {
      address: `${DEMO_REGION} 괴정동`,
      workType: "afternoon",
      workTime: "13:00~18:00",
      shortageCount: 2,
      afternoonJoinOk: true,
    },
  },
  {
    id: 4,
    dayOffset: 1,
    patch: {
      address: `${DEMO_REGION} 내동`,
      status: JOB_STATUS.RECRUITING,
      shortageCount: 1,
      workType: "morning",
      workTime: "09:00~14:00",
    },
  },
  {
    id: 5,
    dayOffset: 1,
    patch: {
      address: `${DEMO_REGION} 만년동`,
      workType: "afternoon",
      workTime: "14:00~18:00",
      shortageCount: 1,
    },
  },
  {
    id: 6,
    dayOffset: 2,
    patch: {
      status: "completed",
      shortageCount: 0,
      workType: "fullDay",
    },
  },
];

function parseKey(key) {
  const [y, m, d] = String(key).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function addDaysToKey(baseKey, days) {
  const d = parseKey(baseKey);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/** 앵커 대비 오늘까지 시프트 (나머지 시드 날짜 유지) */
function shiftJobDateToToday(job, shiftDays) {
  const raw = job?.date || job?.workDate;
  if (!raw) return job;
  const dk =
    typeof raw === "string" && /^\d{4}-\d{2}-\d{2}/.test(raw)
      ? raw.slice(0, 10)
      : toDateKey(new Date(raw));
  const next = addDaysToKey(dk, shiftDays);
  return { ...job, date: next, workDate: next };
}

/**
 * @param {object[]} jobs
 * @returns {object[]}
 */
export function prepareOyajiDemoJobs(jobs) {
  const list = Array.isArray(jobs) ? jobs : [];
  const todayKey = toDateKey(new Date());
  const shiftDays = Math.round(
    (parseKey(todayKey).getTime() - parseKey(DEMO_ANCHOR_DATE).getTime()) / 86400000
  );

  const layoutIds = new Set(OYAJI_DEMO_LAYOUT.map((l) => l.id));

  return list.map((job) => {
    const id = Number(job?.id);
    const layout = OYAJI_DEMO_LAYOUT.find((l) => l.id === id);
    if (layout) {
      const dateKey = addDaysToKey(todayKey, layout.dayOffset);
      return migrateJob({
        ...job,
        ...layout.patch,
        date: dateKey,
        workDate: dateKey,
      });
    }
    if (layoutIds.has(id)) return job;
    return migrateJob(shiftJobDateToToday(job, shiftDays));
  });
}
