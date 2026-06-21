import { CRAFT_LABEL } from "./jobModel";
import { formatRegionsLabel, normalizeActivityRegions } from "../constants/activityRegions";
import { isBetaSeedMode } from "./betaSeed";
import { BETA_FIELD_CONTACTS } from "./betaTestSeed";

/**
 * 현장 작업자 프로필 (직함 고정 없음 — 활동 기반)
 * @typedef {Object} FieldContact
 * @property {string} id
 * @property {string} name
 * @property {number|null} birthYear
 * @property {string} gender
 * @property {string} trade — 검색·내부용
 * @property {string} homeRegion
 * @property {number|null} experienceYears
 * @property {number|null} basePay
 * @property {string[]} workRegions — 노경비(추가 경비 없이 이동) 지역
 * @property {boolean} hasCoworkHistory — 최근 함께 작업 필터용(현장명 UI 미노출)
 * @property {Record<string, string>} [availability] — 날짜별 가능 상태(optional)
 */

const FIELD_CONTACTS_FULL = [
  {
    id: "ct-1",
    name: "김기공",
    nickname: "필름기공92",
    userId: 101,
    birthYear: 1992,
    gender: "남",
    trade: "film",
    homeRegion: "대전 서구",
    experienceYears: 8,
    basePay: 25,
    workRegions: ["대전", "세종"],
    phone: "010-2847-3312",
    favorite: true,
    profileImage: "",
    hasCoworkHistory: true,
  },
  {
    id: "ct-2",
    name: "박조공",
    nickname: "도배반장92",
    userId: 102,
    birthYear: 1992,
    gender: "남",
    trade: "wallpaper",
    homeRegion: "대전 유성구",
    experienceYears: 3,
    basePay: 16,
    workRegions: ["대전"],
    phone: "010-5512-9088",
    favorite: true,
    profileImage: "",
    hasCoworkHistory: true,
  },
  {
    id: "ct-3",
    name: "이준기",
    birthYear: 1995,
    gender: "남",
    trade: "tile",
    homeRegion: "대전 중구",
    experienceYears: 5,
    basePay: 20,
    workRegions: ["대전", "청주"],
    phone: "010-7721-4401",
    favorite: false,
    profileImage: "",
    hasCoworkHistory: false,
  },
  {
    id: "ct-4",
    name: "한전기",
    birthYear: 1990,
    gender: "남",
    trade: "electric",
    homeRegion: "세종 조치원",
    experienceYears: 11,
    basePay: 27,
    workRegions: ["세종", "대전"],
    phone: "010-9033-1180",
    favorite: true,
    profileImage: "",
    hasCoworkHistory: true,
  },
  {
    id: "ct-5",
    name: "정민호",
    birthYear: 1996,
    gender: "남",
    trade: "tile",
    homeRegion: "대전 서구",
    experienceYears: 4,
    basePay: 19,
    workRegions: ["대전"],
    phone: "010-6610-2299",
    favorite: false,
    profileImage: "",
    hasCoworkHistory: false,
  },
  {
    id: "ct-6",
    name: "이소장",
    birthYear: 1985,
    gender: "남",
    trade: "film",
    homeRegion: "대전 둔산",
    experienceYears: 15,
    basePay: 29,
    workRegions: ["대전", "세종"],
    phone: "010-3301-8844",
    favorite: true,
    profileImage: "",
    hasCoworkHistory: true,
  },
  {
    id: "ct-7",
    name: "최오야",
    birthYear: 1982,
    gender: "남",
    trade: "wallpaper",
    homeRegion: "대전 중구",
    experienceYears: 18,
    basePay: 28,
    workRegions: ["대전"],
    phone: "010-1188-5520",
    favorite: false,
    profileImage: "",
    hasCoworkHistory: false,
  },
  {
    id: "ct-8",
    name: "강기공",
    birthYear: 1993,
    gender: "여",
    trade: "paint",
    homeRegion: "대전 유성",
    experienceYears: 7,
    basePay: 23,
    workRegions: ["대전", "세종"],
    phone: "010-4420-7711",
    favorite: false,
    profileImage: "",
    hasCoworkHistory: false,
  },
];

export const FIELD_CONTACTS_MOCK = isBetaSeedMode() ? BETA_FIELD_CONTACTS : FIELD_CONTACTS_FULL;

function parseStringList(value, fallback = []) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return fallback;
}

function parsePayNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function resolveBasePay(raw) {
  const direct = parsePayNumber(raw.basePay);
  if (direct != null) return direct;

  const legacyMin = parsePayNumber(raw.desiredPayMin);
  const legacyMax = parsePayNumber(raw.desiredPayMax);
  if (legacyMin != null && legacyMax != null) return Math.round((legacyMin + legacyMax) / 2);
  if (legacyMin != null) return legacyMin;
  if (legacyMax != null) return legacyMax;

  return parsePayNumber(raw.recentAvgPay);
}

export function normalizeFieldContact(raw, overrides = {}) {
  if (!raw || typeof raw !== "object") return null;

  const trade = raw.trade || "film";
  const legacyRegions = parseStringList(raw.regions);
  const workRegions = parseStringList(raw.workRegions, legacyRegions);
  const legacySites = Array.isArray(raw.sharedSites) ? raw.sharedSites : Array.isArray(raw.recentJobs) ? raw.recentJobs : [];
  const hasCoworkHistory = Boolean(
    raw.hasCoworkHistory ?? (legacySites.length > 0)
  );
  const availability =
    raw.availability && typeof raw.availability === "object" ? { ...raw.availability } : undefined;
  const homeRegions = normalizeActivityRegions(raw.homeRegions ?? raw.homeRegion ?? raw.region);
  const homeRegion = formatRegionsLabel(homeRegions, { emptyLabel: String(raw.homeRegion || raw.region || "").trim() });

  return {
    id: String(raw.id),
    scheduleOwnerId: String(raw.scheduleOwnerId || raw.id),
    userId: Number.isFinite(Number(raw.userId)) ? Number(raw.userId) : null,
    source: raw.source || null,
    nickname: String(raw.nickname || "").trim(),
    name: String(raw.name || "이름없음"),
    birthYear: Number.isFinite(Number(raw.birthYear)) ? Number(raw.birthYear) : null,
    gender: String(raw.gender || "").trim() || "—",
    trade,
    tradeLabel: CRAFT_LABEL[trade] || trade,
    homeRegions,
    homeRegion,
    experienceYears: Number.isFinite(Number(raw.experienceYears)) ? Number(raw.experienceYears) : null,
    basePay: resolveBasePay(raw),
    workRegions,
    phone: String(raw.phone || "").trim(),
    favorite: Boolean(overrides.favorite ?? raw.favorite),
    profileImage: typeof raw.profileImage === "string" ? raw.profileImage : "",
    memo: String(overrides.memo ?? raw.memo ?? "").trim(),
    hasCoworkHistory,
    availability,
  };
}

/**
 * 일당맵 미가입자 판단 — 직접 입력으로 추가한 사람(source:"manual")만 미가입으로 본다.
 * 목 연락처(source 없음)와 가입자 추가(source:"appuser")는 가입자(=기존 동작) 취급.
 */
export function isUnregisteredContact(contact) {
  return contact?.source === "manual";
}

/**
 * 연락처를 구조화 초대/명함 매칭용 안정 숫자 userId로 변환한다.
 * 숫자 id면 그대로, "ct-1" 등 문자열이면 해시. (초대·명함 시트 매칭 공용)
 */
export function contactStableUserId(contact) {
  const direct = Number(contact?.userId ?? contact?.id);
  if (Number.isFinite(direct)) return direct;
  const s = String(contact?.id || contact?.name || "");
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 1000000007;
  return 900000000 + (h % 99999999);
}

export function contactToBusinessCardPerson(contact) {
  if (!contact) return null;
  return {
    id: contact.id,
    name: contact.name,
    role: "",
    craft: contact.tradeLabel || contact.trade,
    region: contact.homeRegion || "—",
    phone: contact.phone,
    photo: contact.profileImage || "",
    rating: "4.8",
    experience: contact.experienceYears ? `경력 ${contact.experienceYears}년` : "",
  };
}

export function formatContactMetaLine(contact) {
  const age = contact.birthYear ? `${String(contact.birthYear).slice(-2)}년생` : "";
  const parts = [age, contact.gender].filter(Boolean);
  return parts.join(" · ");
}

export function formatContactCareerLine(contact) {
  if (!contact?.experienceYears) return "";
  return `경력 ${contact.experienceYears}년`;
}

export function formatContactBasePayLine(contact) {
  if (contact?.basePay == null) return "";
  return `기본 ${contact.basePay}만`;
}

export function formatContactNoTravelRegionsLine(contact) {
  const list = contact.workRegions || [];
  if (!list.length) return "";
  return `노경비 ${list.join("·")}`;
}

export function formatContactHomeLine(contact) {
  if (!contact?.homeRegion) return "";
  return `거주 ${contact.homeRegion}`;
}

/** 카드 요약 한 줄: 경력 · 기본 단가 · 노경비 지역 */
export function formatContactSummaryLine(contact) {
  return [
    formatContactCareerLine(contact),
    formatContactBasePayLine(contact),
    formatContactNoTravelRegionsLine(contact),
  ]
    .filter(Boolean)
    .join(" · ");
}

export function contactHasRecentWork(contact) {
  return Boolean(contact?.hasCoworkHistory);
}

export function getContactRecentWorkAt(contact) {
  return contactHasRecentWork(contact) ? 1 : 0;
}

export function getContactDisplayName(contact) {
  return String(contact?.nickname || contact?.name || "").trim() || "이름없음";
}

export function formatContactDesiredPay(contact) {
  const pay = Number(contact?.basePay);
  if (!Number.isFinite(pay) || pay <= 0) return "";
  return `희망일당 ${pay}만원`;
}

export function formatContactListMetaLine(contact) {
  const age = contact.birthYear ? `${String(contact.birthYear).slice(-2)}년생` : "";
  const region = String(contact.homeRegion || "").trim();
  const pay = formatContactDesiredPay(contact);
  return [age, region, pay].filter(Boolean).join(" · ");
}

export function getContactSearchBlob(contact) {
  return [
    getContactDisplayName(contact),
    contact.name,
    contact.tradeLabel,
    contact.homeRegion,
    formatContactSummaryLine(contact),
  ]
    .join(" ")
    .toLowerCase();
}

/** 목록용 가능 날짜 한 줄 힌트 */
export function formatContactAvailabilityHint(contact) {
  if (!contact) return "";
  const av = contact.availability;
  const today = new Date();
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (av && typeof av === "object") {
    const st = av[key];
    if (st === "available" || st === "ok") return "오늘 가능";
    if (st === "busy" || st === "unavailable") return "오늘 불가";
  }
  const seed = String(contact.id || contact.name || "").length + today.getDate();
  if (contact.favorite && seed % 2 === 0) return "오늘 가능";
  if (contactHasRecentWork(contact) && seed % 3 !== 0) return "이번 주 가능";
  return "가능 날짜 확인";
}
