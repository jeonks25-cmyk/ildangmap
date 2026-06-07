/**
 * 베타 테스트용 최소 시드 — 5직종(필름·도배·전기·설비·페인트) × 장소 × 일정
 * REACT_APP_BETA_SEED=true + Mock API 권장
 */

const BASE = {
  lat: 36.35,
  lng: 127.3845,
  pay: "150,000원",
  status: "recruiting",
  workType: "fullDay",
  workTime: "08:00~17:00",
  ownerUserId: 1,
  participants: [],
  briefing: [],
  alerts: [],
};

function shiftDateKey(offsetDays) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const BETA_FIELD_CONTACTS = [
  {
    id: "beta-ct-film",
    name: "김필름",
    birthYear: 1991,
    gender: "남",
    trade: "film",
    homeRegion: "대전 서구",
    experienceYears: 9,
    basePay: 24,
    workRegions: ["대전", "세종"],
    phone: "010-2001-0001",
    favorite: true,
    hasCoworkHistory: true,
  },
  {
    id: "beta-ct-wallpaper",
    name: "박도배",
    birthYear: 1994,
    gender: "남",
    trade: "wallpaper",
    homeRegion: "대전 유성",
    experienceYears: 6,
    basePay: 22,
    workRegions: ["대전"],
    phone: "010-2002-0002",
    favorite: true,
    hasCoworkHistory: true,
  },
  {
    id: "beta-ct-electric",
    name: "이전기",
    birthYear: 1989,
    gender: "남",
    trade: "electric",
    homeRegion: "세종",
    experienceYears: 12,
    basePay: 26,
    workRegions: ["세종", "대전"],
    phone: "010-2003-0003",
    favorite: false,
    hasCoworkHistory: true,
  },
  {
    id: "beta-ct-facility",
    name: "최설비",
    birthYear: 1993,
    gender: "남",
    trade: "facility",
    homeRegion: "대전 중구",
    experienceYears: 7,
    basePay: 23,
    workRegions: ["대전"],
    phone: "010-2004-0004",
    favorite: false,
    hasCoworkHistory: false,
  },
  {
    id: "beta-ct-paint",
    name: "정페인트",
    birthYear: 1996,
    gender: "남",
    trade: "paint",
    homeRegion: "대전 서구",
    experienceYears: 5,
    basePay: 21,
    workRegions: ["대전", "청주"],
    phone: "010-2005-0005",
    favorite: true,
    hasCoworkHistory: false,
  },
];

export const BETA_JOBS = [
  {
    ...BASE,
    id: 9001,
    title: "둔산동 상가 인테리어필름",
    siteKind: "상가",
    craft: "film",
    trade: "기공",
    address: "대전 서구 둔산동",
    addressDetail: "대전 서구 둔산남로 120",
    shortRegion: "대전 서구 둔산동",
    date: shiftDateKey(1),
    lat: 36.356,
    lng: 127.378,
    pay: "140,000원",
    listImage: "https://picsum.photos/seed/beta-film/112/112",
  },
  {
    ...BASE,
    id: 9002,
    title: "궁동 아파트 도배",
    siteKind: "아파트",
    craft: "wallpaper",
    trade: "기공",
    address: "대전 유성구 궁동",
    addressDetail: "대전 유성구 봉명대로 88",
    shortRegion: "대전 유성구 궁동",
    date: shiftDateKey(2),
    lat: 36.362,
    lng: 127.352,
    pay: "155,000원",
    listImage: "https://picsum.photos/seed/beta-wall/112/112",
  },
  {
    ...BASE,
    id: 9003,
    title: "봉명동 상가 전기 공사",
    siteKind: "상가",
    craft: "electric",
    trade: "기공",
    address: "대전 유성구 봉명동",
    addressDetail: "대전 유성구 대학로 99",
    shortRegion: "대전 유성구 봉명동",
    date: shiftDateKey(3),
    lat: 36.355,
    lng: 127.341,
    pay: "160,000원",
    listImage: "https://picsum.photos/seed/beta-elec/112/112",
  },
  {
    ...BASE,
    id: 9004,
    title: "관저동 신축 설비 배관",
    siteKind: "신축",
    craft: "facility",
    trade: "기공",
    address: "대전 서구 관저동",
    addressDetail: "대전 서구 관저북로 44",
    shortRegion: "대전 서구 관저동",
    date: shiftDateKey(4),
    lat: 36.348,
    lng: 127.335,
    pay: "165,000원",
    listImage: "https://picsum.photos/seed/beta-fac/112/112",
  },
  {
    ...BASE,
    id: 9005,
    title: "월평동 상가 페인트 마감",
    siteKind: "상가",
    craft: "paint",
    trade: "기공",
    address: "대전 서구 월평동",
    addressDetail: "대전 서구 월평중로 21",
    shortRegion: "대전 서구 월평동",
    date: shiftDateKey(5),
    lat: 36.358,
    lng: 127.366,
    pay: "150,000원",
    listImage: "https://picsum.photos/seed/beta-paint/112/112",
  },
];

export const BETA_SCHEDULES = BETA_JOBS.map((job, index) => {
  const workDate = shiftDateKey(index + 1);
  const craftLabel = { film: "필름", wallpaper: "도배", electric: "전기", facility: "설비", paint: "페인트" }[
    job.craft
  ];
  return {
    id: `beta-sched-${job.craft}`,
    jobId: job.id,
    fieldId: `beta-field-${job.craft}`,
    source: "mock",
    sourceJobMatchReady: true,
    workDate,
    endDate: workDate,
    workDateEnd: workDate,
    durationDays: 1,
    title: job.title.replace(/ .+$/, "") || job.title,
    craft: job.craft,
    pay: job.pay,
    workType: job.workType,
    workTime: job.workTime,
    shortRegion: job.shortRegion,
    fullAddress: job.addressDetail,
    lat: job.lat,
    lng: job.lng,
    parkingNote: "주차 가능",
    mealNote: "점심 제공",
    summaryLines: [`베타 테스트 ${craftLabel} 현장`, job.addressDetail],
    status: "confirmed",
    canRecruitUrgent: true,
    assignedWorker: BETA_FIELD_CONTACTS[index]?.name || "담당자",
    settlementStatus: "waiting",
    teamName: `${craftLabel} 베타팀`,
    siteLabel: job.shortRegion,
    crewCount: 2,
    settledWorkerCount: 0,
    createdByUserId: 1,
    scheduleInvites: [],
    workerAssignments: [],
  };
});

/** 베타 인원 기본 그룹 (선택) */
export const BETA_DEFAULT_GROUP = {
  id: "beta-grp-trades",
  name: "베타 5직종",
  sortOrder: 0,
  createdAt: new Date().toISOString(),
  tradeHint: null,
};

export const BETA_GROUP_MEMBER_IDS = BETA_FIELD_CONTACTS.map((c) => c.id);
