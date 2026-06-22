/**
 * 일정 제목 우선순위
 * 1) 상호명 (업종 키워드)
 * 2) 건물명 + 호수 (동 없음)
 * 3) 아파트명 + 동·호
 * 4) 주소 (마지막 fallback, 조각 주소 제외)
 */

import { buildSiteTitle, pickPlausibleApartmentName } from "./siteFieldParser";
import { isNoiseLine } from "./siteFieldParser";

export const BUSINESS_INDUSTRY_KEYWORDS = [
  "코인노래연습장",
  "노래연습장",
  "스크린골프",
  "PC방",
  "카페",
  "식당",
  "미용실",
  "병원",
  "의원",
  "학원",
  "편의점",
  "마트",
  "슈퍼",
  "베이커리",
  "헬스",
  "요가",
  "필라테스",
  "당구장",
  "연습실",
  "스튜디오",
  "인테리어",
  "건설",
  "하우스",
  "디자인",
];

const BUILDING_SUFFIX_RE =
  /(?:타워|빌딩|센터|프라자|플라자|몰|오피스|법조|스퀘어|시티|파크|타운|빌|호텔|레지던스)/u;

const BUILDING_UNIT_RE =
  /([가-힣A-Za-z0-9]{2,20}(?:타워|빌딩|센터|프라자|플라자|몰|오피스|법조|스퀘어|시티|파크|타운|빌|호텔|레지던스))\s*(\d{2,4})\s*호/u;

const PROVINCE_PREFIX_RE = /^(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/u;

/** 주소·주소 조각 — 제목으로 쓰이면 안 됨 */
export function isAddressLikeTitle(text) {
  const t = String(text || "").trim();
  if (!t) return true;

  if (PROVINCE_PREFIX_RE.test(t) && /시|군|구/.test(t)) return true;

  const adminTokens = t.match(/[가-힣]+(?:특별시|광역시|시|군|구|읍|면|동|리)/g) || [];
  if (adminTokens.length >= 2 && !/\s/.test(t) && t.length > 8) return true;

  if (/[가-힣]{2,8}시[가-힣]{2,8}구/u.test(t) && !/\s/.test(t)) return true;

  if (/(?:로|길|대로)\s*\d/.test(t)) return true;
  if (/\d+\s*(?:번길|번지)/.test(t)) return true;

  return false;
}

/** 주소 fallback 후보 — 공백·구분이 있는 정상 주소만 */
export function isWellFormedAddressLine(text) {
  const t = String(text || "").trim();
  if (t.length < 6) return false;
  if (!/(?:시|군|구|읍|면)/.test(t) && !/(?:로|길|대로)\s*\d/.test(t)) return false;
  if (isAddressLikeTitle(t) && !/\s/.test(t)) return false;
  return /\s/.test(t) || /(?:로|길|대로)\s*\d/.test(t);
}

function stripLineMeta(line) {
  return String(line || "")
    .replace(/(?:공동|세대|공용|현관)?비번\s*[:：#]?\s*\S+/giu, "")
    .replace(/(?:공동|세대|공용|현관)?비밀번호\s*[:：#]?\s*\S+/giu, "")
    .trim();
}

/**
 * 1) 상호명 — 업종 키워드 포함
 */
export function findBusinessTitle(lines = []) {
  const sortedKeywords = [...BUSINESS_INDUSTRY_KEYWORDS].sort((a, b) => b.length - a.length);

  for (const rawLine of lines) {
    if (isNoiseLine(rawLine)) continue;
    const line = stripLineMeta(rawLine);
    if (!line || line.length > 40) continue;

    for (const kw of sortedKeywords) {
      if (!line.includes(kw)) continue;

      let candidate = line.trim();
      if (candidate.length > 28) {
        const idx = line.indexOf(kw);
        const start = Math.max(0, idx - 10);
        candidate = line.slice(start, idx + kw.length).trim();
      }

      if (candidate.length < kw.length) continue;
      if (isAddressLikeTitle(candidate)) continue;
      if (/^\d+$/.test(candidate)) continue;
      return candidate;
    }
  }
  return "";
}

/**
 * 2) 건물명 + 호수 (동 없음) — 에이스법조타워 212호
 */
export function findBuildingUnitTitle(lines = [], rawText = "") {
  const sources = [...lines, rawText].filter(Boolean);

  for (const src of sources) {
    const text = stripLineMeta(src);
    if (!text || /\d{3,4}\s*동/u.test(text)) continue;

    const m = text.match(BUILDING_UNIT_RE);
    if (m) {
      const title = `${m[1]} ${m[2]}호`.replace(/\s+/g, " ").trim();
      if (!isAddressLikeTitle(title)) return title;
    }

    const generic = text.match(/([가-힣A-Za-z0-9]{3,16})\s+(\d{2,4})\s*호/u);
    if (generic && BUILDING_SUFFIX_RE.test(generic[1]) && !/\d+\s*동/u.test(text)) {
      const title = `${generic[1]} ${generic[2]}호`;
      if (!isAddressLikeTitle(title)) return title;
    }
  }
  return "";
}

/**
 * 3) 아파트명 + 동·호
 */
export function buildApartmentDongHoTitle({ apartmentName, siteNameCandidates, building, unit }) {
  const apt = pickPlausibleApartmentName(apartmentName, siteNameCandidates);
  const b = String(building || "").trim();
  const u = String(unit || "").trim();
  if (!b || !u) return "";
  return buildSiteTitle({ siteName: apt, building: b, unit: u });
}

/**
 * 4) 주소 fallback
 */
export function findAddressFallbackTitle(lines = []) {
  for (const line of lines) {
    if (isNoiseLine(line)) continue;
    const cleaned = stripLineMeta(line);
    if (!isWellFormedAddressLine(cleaned)) continue;
    if (isAddressLikeTitle(cleaned)) continue;
    return cleaned;
  }
  return "";
}

/**
 * @returns {{ title, titlePath, titleLineIndex, titleRemainder, resolvedTitle, parsedTitle, legacyTitle }}
 */
export function resolveScheduleTitleByPriority({
  apartmentName = "",
  siteNameCandidates = [],
  building = "",
  unit = "",
  lines = [],
  rawText = "",
  titleDiag = { steps: [] },
}) {
  const empty = {
    title: "",
    resolvedTitle: "",
    parsedTitle: "",
    legacyTitle: "",
    titlePath: null,
    titleLineIndex: -1,
    titleRemainder: "",
  };

  const businessTitle = findBusinessTitle(lines);
  if (businessTitle) {
    titleDiag.steps.push({ step: "priority1_business_name", title: businessTitle });
    return {
      ...empty,
      title: businessTitle,
      parsedTitle: businessTitle,
      titlePath: "priority1_business_name",
      titleLineIndex: lines.findIndex((l) => l.includes(businessTitle)),
    };
  }

  const buildingUnitTitle = findBuildingUnitTitle(lines, rawText);
  if (buildingUnitTitle) {
    titleDiag.steps.push({ step: "priority2_building_unit", title: buildingUnitTitle });
    return {
      ...empty,
      title: buildingUnitTitle,
      parsedTitle: buildingUnitTitle,
      titlePath: "priority2_building_unit",
      titleLineIndex: lines.findIndex((l) => l.includes(buildingUnitTitle.split(" ")[0])),
    };
  }

  const aptTitle = buildApartmentDongHoTitle({
    apartmentName,
    siteNameCandidates,
    building,
    unit,
  });
  if (aptTitle) {
    const b = String(building || "").trim();
    const u = String(unit || "").trim();
    const apt = pickPlausibleApartmentName(apartmentName, siteNameCandidates);
    const titlePath = apt ? "priority3_apartment_dong_ho" : "priority3_dong_ho_only";
    const titleLineIndex = lines.findIndex((line) => {
      const compact = String(line || "").replace(/\s+/g, "");
      return compact.includes(`${b}동`) && (compact.includes(`${u}호`) || compact.includes(u));
    });
    titleDiag.steps.push({ step: titlePath, title: aptTitle, building: b, unit: u });
    return {
      ...empty,
      title: aptTitle,
      resolvedTitle: aptTitle,
      titlePath,
      titleLineIndex,
    };
  }

  const addressTitle = findAddressFallbackTitle(lines);
  if (addressTitle) {
    titleDiag.steps.push({ step: "priority4_address_fallback", title: addressTitle });
    return {
      ...empty,
      title: addressTitle,
      legacyTitle: addressTitle,
      titlePath: "priority4_address_fallback",
      titleLineIndex: lines.findIndex((l) => l.includes(addressTitle.slice(0, 6))),
    };
  }

  titleDiag.steps.push({ step: "no_title_candidate" });
  return { ...empty, titlePath: "no_title_candidate" };
}
