import { TRADE_KEYS } from "../overlays/jobSpeechBubbleOverlay";

export const JOBS_STORAGE_KEY = "jobs_v2";

export const TRADE_SET = new Set(TRADE_KEYS);

export const initialJobs = [
  {
    id: 1,
    title: "필름 보조 (당일지급)",
    trade: "준기공",
    lat: 36.356,
    lng: 127.378,
    pay: "140,000원",
    address: "대전 서구",
    shortAddress: "대전 서구",
    applicants: 3,
  },
  {
    id: 2,
    title: "도장 전처리 및 보조",
    trade: "기공",
    lat: 36.341,
    lng: 127.39,
    pay: "150,000원",
    address: "대전 유성구",
    shortAddress: "대전 유성구",
    applicants: 5,
  },
  {
    id: 3,
    title: "타일 시공 보조 구함",
    trade: "조공",
    lat: 36.328,
    lng: 127.43,
    pay: "200,000원",
    address: "대전 동구",
    shortAddress: "대전 동구",
    applicants: 1,
  },
  {
    id: 4,
    title: "현장 관리 오야지 모심",
    trade: "오야지",
    lat: 36.365,
    lng: 127.395,
    pay: "180,000원",
    address: "대전 중구",
    shortAddress: "대전 중구",
    applicants: 0,
  },
];

export function loadStoredJobs() {
  try {
    const raw = localStorage.getItem(JOBS_STORAGE_KEY);
    if (!raw) return initialJobs;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return initialJobs;
    return parsed
      .filter((job) => job && typeof job === "object")
      .map((job, index) => ({
        ...job,
        id: Number.isFinite(job.id) ? job.id : Date.now() + index,
        applicants: Number.isFinite(job.applicants) ? job.applicants : 0,
        trade: TRADE_SET.has(job.trade) ? job.trade : "조공",
      }));
  } catch (e) {
    return initialJobs;
  }
}
