/**
 * 현장 정보 추출기 — 카톡·문자 OCR/붙여넣기 공통
 */

export const SITE_BRAND_NAMES = [
  "영림",
  "현대",
  "KCC",
  "LX",
  "신한",
  "한샘",
  "동양",
  "대림",
  "코니",
  "LG",
  "삼성",
  "3M",
];

const COMPACT_DONG_HO_RE =
  /([가-힣A-Za-z]{2,20})(?:\1)?(\d{3,4})\s*동\s*(\d{2,4})\s*호/u;
const COMPACT_DONG_HO_NO_SPACE_RE =
  /([가-힣A-Za-z]{2,20})(?:\1)?(\d{3,4})동(\d{2,4})호/u;
const DONG_HO_RE = /(\d{3,4})\s*동\s*(\d{2,4})\s*호/u;
const APT_NAME_RE = /([가-힣A-Za-z0-9]{2,20}(?:아파트|APT|apt|오피스텔|빌라|빌딩|타워|단지))/iu;
const COMMON_PW_RE =
  /(?:공동(?:현관)?(?:비번|비밀번호|번호)|공동비번)\s*[:：]?\s*([#*\d]{3,8})/iu;
const HOUSE_PW_RE =
  /(?:세대(?:비번|비밀번호|번호)|현관(?:비번|비밀번호)|비번|비밀번호|출입(?:번호|비번))\s*[:：]?\s*([#*\d]{3,8})/iu;
const WORK_ITEM_RE =
  /(?:작업(?:내용|일지|항목)|공사(?:내용|항목)|시공(?:내용|항목))\s*[:：]?\s*(.+)$/iu;

function normalizeText(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/[|｜]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDigits(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function detectBrands(text) {
  const found = [];
  for (const brand of SITE_BRAND_NAMES) {
    const re = new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (re.test(text)) found.push(brand);
  }
  return found;
}

function extractCompactUnit(blob) {
  const m = blob.match(COMPACT_DONG_HO_NO_SPACE_RE) || blob.match(COMPACT_DONG_HO_RE);
  if (!m) return null;
  let apartmentName = String(m[1] || "").trim();
  apartmentName = apartmentName.replace(/(아파트|APT|apt)$/iu, "").trim();
  return {
    apartmentName,
    building: normalizeDigits(m[2]),
    unit: normalizeDigits(m[3]),
    confidence: 0.88,
    source: "compact_dong_ho",
  };
}

function extractLooseUnit(blob) {
  const m = blob.match(DONG_HO_RE);
  if (!m) return null;
  const before = blob.slice(0, m.index).trim();
  let apartmentName = "";
  const aptMatch = before.match(/([가-힣A-Za-z0-9]{2,20})\s*$/u);
  if (aptMatch) {
    apartmentName = aptMatch[1].replace(/(아파트|APT|apt)$/iu, "").trim();
  } else {
    const apt = before.match(APT_NAME_RE);
    if (apt) apartmentName = apt[1].replace(/(아파트|APT|apt)$/iu, "").trim();
  }
  return {
    apartmentName,
    building: normalizeDigits(m[1]),
    unit: normalizeDigits(m[2]),
    confidence: apartmentName ? 0.78 : 0.62,
    source: "dong_ho",
  };
}

function extractPasswords(blob) {
  const commonMatch = blob.match(COMMON_PW_RE);
  const houseMatch = blob.match(HOUSE_PW_RE);
  let commonPassword = commonMatch ? commonMatch[1] : "";
  let housePassword = houseMatch ? houseMatch[1] : "";

  if (commonPassword && housePassword && commonPassword === housePassword) {
    housePassword = "";
  }
  if (!commonPassword && housePassword) {
    commonPassword = housePassword;
    housePassword = "";
  }

  return { commonPassword, housePassword };
}

function extractWorkItems(lines) {
  const items = [];
  for (const line of lines) {
    const m = line.match(WORK_ITEM_RE);
    if (m) {
      items.push(m[1].trim());
      continue;
    }
    if (/필름|도배|타일|페인트|줄눈|방충|씰|시공|공사/u.test(line) && line.length <= 80) {
      items.push(line.trim());
    }
  }
  return [...new Set(items)].slice(0, 8);
}

/**
 * @param {string} text
 * @returns {import('./siteInfoStructurer').SiteExtractResult}
 */
export function extractSiteInfo(text) {
  const rawText = String(text || "").trim();
  const blob = normalizeText(rawText);
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const unit =
    extractCompactUnit(blob.replace(/\s+/g, "")) ||
    extractCompactUnit(blob) ||
    extractLooseUnit(blob);

  const { commonPassword, housePassword } = extractPasswords(blob);
  const brands = detectBrands(blob);
  const workItems = extractWorkItems(lines);

  let apartmentName = unit?.apartmentName || "";
  if (!apartmentName) {
    const apt = blob.match(APT_NAME_RE);
    if (apt) apartmentName = apt[1].replace(/(아파트|APT|apt)$/iu, "").trim();
  }

  const building = unit?.building || "";
  const unitNo = unit?.unit || "";

  let confidence = 0;
  if (building && unitNo) {
    confidence = unit?.confidence || 0.7;
    if (apartmentName) confidence = Math.min(0.95, confidence + 0.12);
    if (commonPassword || housePassword) confidence = Math.min(0.98, confidence + 0.04);
  } else if (apartmentName) {
    confidence = 0.35;
  }

  return {
    apartmentName,
    building,
    unit: unitNo,
    commonPassword,
    housePassword,
    workItems,
    brands,
    confidence,
    hasUnit: Boolean(building && unitNo),
    rawText,
  };
}

export function buildScheduleTitle({ apartmentName, building, unit }) {
  const apt = String(apartmentName || "").trim();
  const dong = normalizeDigits(building);
  const ho = normalizeDigits(unit);
  if (!dong || !ho) return apt || "";
  const aptPart = apt ? `${apt} ` : "";
  return `${aptPart}${dong}동 ${ho}호`.replace(/\s+/g, " ").trim();
}

export function buildAddressLine({ apartmentName, building, unit }) {
  const title = buildScheduleTitle({ apartmentName, building, unit });
  if (!title) return "";
  return `${title}${apartmentName && !title.includes("아파트") ? " 아파트" : ""}`.trim();
}
