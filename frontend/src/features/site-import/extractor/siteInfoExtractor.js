/**
 * 현장 정보 추출기 — 카톡·문자 OCR/붙여넣기 공통 (2차)
 */

import { inferCraftFromText } from "./craftInference";
import { APT_COMPLEX_BRANDS as DICT_APT_BRANDS } from "../normalizer/siteNameDictionary";

export { APT_COMPLEX_BRANDS } from "../normalizer/siteNameDictionary";

export const SITE_BRAND_NAMES = [
  "영림",
  "현대",
  "KCC",
  "LX",
  "3M",
  "신한",
  "한샘",
  "동양",
  "대림",
  "코니",
  "LG",
  "삼성",
  "썬팅",
];

const APT_COMPLEX_BRANDS = DICT_APT_BRANDS;

const DONG_HO_GLOBAL_RE = /(\d{3,4})\s*동\s*(\d{2,4})\s*호/gu;
const DONG_HO_COMPACT_RE = /(\d{3,4})동(\d{2,4})호/gu;
const APT_SUFFIX_RE = /(아파트|APT|apt|오피스텔|빌라|빌딩|타워|단지)/iu;

const COMMON_PW_PATTERNS = [
  /(?:공비|공동(?:비번|비밀번호|번호)?|공용(?:비번|비밀번호)|공동현관(?:비번|번호)?)\s*[:：]?\s*([#*\d]{3,8})/giu,
  /(?:공동\s*비번)\s*[:：]?\s*([#*\d]{3,8})/giu,
];

const HOUSE_PW_PATTERNS = [
  /(?:세비|세대(?:비번|비밀번호|번호)?|현관(?:비번|비밀번호|번호)?)\s*[:：]?\s*([#*\d*]{3,10})/giu,
];

const CRAFT_LABELS = {
  film: "필름",
  wallpaper: "도배",
  tile: "타일",
  electric: "전기",
  paint: "페인트",
  facility: "설비",
};

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

function isDateOrPasswordLine(line) {
  const s = String(line || "").trim();
  if (!s) return true;
  if (/^\d{1,2}\s*[/.월]\s*\d{1,2}/.test(s)) return true;
  if (/(?:공비|세비|공동|세대|비번|비밀번호)/.test(s)) return true;
  return false;
}

/** 반복 접미사 제거: 장재계룡계룡 → 장재계룡 */
function dedupeRepeatedSuffix(name) {
  let s = String(name || "").trim();
  if (s.length < 4) return s;
  for (let len = 2; len <= Math.min(6, Math.floor(s.length / 2)); len++) {
    const tail = s.slice(-len);
    if (s.endsWith(tail + tail)) {
      return s.slice(0, -len).trim();
    }
  }
  return s;
}

/** 브랜드명 기준 토큰 결합 */
function mergeApartmentTokens(tokens) {
  const parts = tokens
    .flatMap((t) => String(t || "").split(/\s+/))
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !/^\d+$/.test(t));

  if (!parts.length) return "";

  const joined = parts.join(" ").replace(APT_SUFFIX_RE, "").trim();
  const compact = joined.replace(/\s+/g, "");

  for (const brand of APT_COMPLEX_BRANDS) {
    const brandRe = new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (brandRe.test(compact)) {
      const idx = compact.search(brandRe);
      const before = compact.slice(0, idx);
      const brandPart = compact.slice(idx, idx + brand.length);
      const after = compact.slice(idx + brand.length);
      const result = [before, brandPart, after].filter(Boolean).join("").replace(/\s+/g, "");
      return dedupeRepeatedSuffix(result);
    }
  }

  return dedupeRepeatedSuffix(compact);
}

function findPrimaryDongHo(text, lines) {
  const compact = text.replace(/\s+/g, "");
  let best = null;

  for (const re of [DONG_HO_COMPACT_RE, DONG_HO_GLOBAL_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(compact)) !== null) {
      const building = normalizeDigits(m[1]);
      const unit = normalizeDigits(m[2]);
      if (building.length < 3 || unit.length < 2) continue;
      const idx = m.index;
      const prefix = compact.slice(0, idx);
      best = { building, unit, prefix, index: idx, lineIndex: -1 };
    }
  }

  if (!best) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const m = line.match(/(\d{3,4})\s*동\s*(\d{2,4})\s*호/u) || line.match(/(\d{3,4})동(\d{2,4})호/u);
      if (!m) continue;
      const building = normalizeDigits(m[1]);
      const unit = normalizeDigits(m[2]);
      if (building.length < 3) continue;
      const beforeSame = line.slice(0, m.index).trim();
      best = { building, unit, prefix: beforeSame.replace(/\s+/g, ""), index: m.index, lineIndex: i };
      break;
    }
  }

  return best;
}

function extractApartmentName(best, lines, blob) {
  const tokens = [];

  if (best?.prefix) {
    tokens.push(best.prefix);
  }

  if (best?.lineIndex >= 0) {
    for (let j = best.lineIndex - 1; j >= 0 && j >= best.lineIndex - 2; j--) {
      const line = lines[j];
      if (isDateOrPasswordLine(line)) continue;
      if (/(\d{3,4})\s*동\s*(\d{2,4})\s*호/u.test(line)) continue;
      tokens.unshift(line);
    }
    const sameLineBefore = lines[best.lineIndex]?.slice(0, best.index).trim();
    if (sameLineBefore && !tokens.includes(sameLineBefore)) {
      tokens.unshift(sameLineBefore);
    }
  }

  let name = mergeApartmentTokens(tokens);

  if (!name || name.length < 2) {
    const aptMatch = blob.match(/([가-힣A-Za-z0-9]{2,24}(?:아파트|APT|apt|단지))/iu);
    if (aptMatch) name = aptMatch[1].replace(APT_SUFFIX_RE, "").trim();
  }

  if (!name && best?.prefix) {
    name = dedupeRepeatedSuffix(best.prefix);
  }

  return String(name || "")
    .replace(APT_SUFFIX_RE, "")
    .replace(/\d+\s*동$/u, "")
    .trim();
}

function extractPasswords(text) {
  let commonPassword = "";
  let housePassword = "";

  for (const re of COMMON_PW_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      if (!commonPassword) commonPassword = m[1];
    }
  }

  for (const re of HOUSE_PW_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      if (!housePassword) housePassword = m[1];
    }
  }

  if (commonPassword && housePassword && commonPassword === housePassword) {
    housePassword = "";
  }

  return { commonPassword, housePassword };
}

function detectBrands(text) {
  const found = [];
  for (const brand of [...SITE_BRAND_NAMES, ...APT_COMPLEX_BRANDS]) {
    const re = new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (re.test(text) && !found.includes(brand)) found.push(brand);
  }
  return found;
}

function extractWorkItems(lines, blob) {
  const items = [];
  for (const line of lines) {
    const m = line.match(WORK_ITEM_RE);
    if (m) {
      items.push(m[1].trim());
      continue;
    }
    if (/필름|도배|타일|페인트|줄눈|방충|씰|시공|공사|벽지|썬팅/u.test(line) && line.length <= 100) {
      items.push(line.trim());
    }
  }
  if (!items.length && /필름|도배|타일|페인트/u.test(blob)) {
    const hint = blob.match(/(?:필름|도배|타일|페인트)[^\n]{0,40}/u);
    if (hint) items.push(hint[0].trim());
  }
  return [...new Set(items)].slice(0, 8);
}

/**
 * @param {string} text
 */
export function extractSiteInfo(text) {
  const rawText = String(text || "").trim();
  const blob = normalizeText(rawText);
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const dongHo = findPrimaryDongHo(blob, lines);
  const apartmentName = extractApartmentName(dongHo, lines, blob);
  const building = dongHo?.building || "";
  const unitNo = dongHo?.unit || "";
  const { commonPassword, housePassword } = extractPasswords(rawText);
  const brands = detectBrands(blob);
  const workItems = extractWorkItems(lines, blob);
  const craftResult = inferCraftFromText(blob);

  let confidence = 0;
  if (building && unitNo) {
    confidence = 0.72;
    if (apartmentName && apartmentName.length >= 2) confidence += 0.12;
    if (commonPassword) confidence += 0.04;
    if (housePassword) confidence += 0.04;
    if (craftResult.craft) confidence += 0.04;
    confidence = Math.min(0.98, confidence);
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
    craft: craftResult.craft,
    craftConfidence: craftResult.confidence,
    craftMatched: craftResult.matched,
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
  return title;
}

/**
 * OCR 검증 체크리스트
 * @param {ReturnType<typeof extractSiteInfo>} info
 */
export function buildSiteVerificationChecklist(info) {
  if (!info) return [];

  const rows = [
    {
      key: "apartment",
      label: "아파트명",
      status: info.apartmentName && info.apartmentName.length >= 2 ? "ok" : "missing",
      detail: info.apartmentName || "미검출",
    },
    {
      key: "unit",
      label: "동/호수",
      status: info.hasUnit ? "ok" : "missing",
      detail: info.hasUnit ? `${info.building}동 ${info.unit}호` : "미검출",
    },
    {
      key: "commonPassword",
      label: "공동비밀번호",
      status: info.commonPassword ? "ok" : "missing",
      detail: info.commonPassword || "미검출",
    },
    {
      key: "housePassword",
      label: "세대비밀번호",
      status: info.housePassword ? "ok" : "missing",
      detail: info.housePassword || "미검출",
    },
    {
      key: "craft",
      label: "공정",
      status: info.craft ? "ok" : "warn",
      detail: info.craft ? CRAFT_LABELS[info.craft] || info.craft : "자동 추론 실패",
    },
    {
      key: "workItems",
      label: "작업내용",
      status: info.workItems?.length ? "ok" : "warn",
      detail: info.workItems?.length ? info.workItems.slice(0, 2).join(" · ") : "일부 누락 가능",
    },
  ];

  return rows;
}

export function formatChecklistSummary(checklist) {
  if (!Array.isArray(checklist) || !checklist.length) return "";
  return checklist
    .map((row) => {
      const icon = row.status === "ok" ? "✓" : row.status === "warn" ? "⚠" : "✗";
      const suffix =
        row.status === "warn" && row.key === "workItems"
          ? " 일부 누락 가능"
          : row.status === "ok"
            ? " 확인"
            : row.status === "missing"
              ? " 미검출"
              : "";
      return `${icon} ${row.label}${suffix}`;
    })
    .join("\n");
}
