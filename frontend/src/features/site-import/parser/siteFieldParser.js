/**
 * 현장 특화 구조화 파서 — OCR/붙여넣기 공통
 * 장재계룡계룡1109동1402호 → 현장명·동·호 분리
 */

import { APT_COMPLEX_BRANDS } from "../normalizer/siteNameDictionary";
import { isStructureDebugEnabled } from "./siteImportStructureMetrics";

const DONG_HO_COMPACT_RE = /(\d{3,4})동(\d{2,4})호/gu;
const DONG_HO_SPACED_RE = /(\d{3,4})\s*동\s*(\d{2,4})\s*호/gu;
const APT_SUFFIX_RE = /(아파트|APT|apt|오피스텔|빌라|빌딩|타워|단지)/iu;
const OCR_NOISE_LINE_RE =
  /^(KT|SKT|LG\s*U\+|5G|LTE|Wi-Fi|WiFi|Md&@p|[\W_]{1,6})$/i;
const STATUS_TIME_RE = /^(\d{1,2}:\d{2}|오전\s*\d|오후\s*\d|»)/;
const KEYBOARD_GARBAGE_RE = /^[a-z]{1,3}$/i;

/** 반복 접미사 제거: 장재계룡계룡 → 장재계룡 */
export function dedupeRepeatedSuffix(name) {
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

export function normalizeOcrBlob(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/[|｜»]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function compactBlob(text) {
  return normalizeOcrBlob(text).replace(/\s+/g, "");
}

export function stripSiteSuffix(value) {
  return String(value || "")
    .replace(APT_SUFFIX_RE, "")
    .replace(/\d+\s*동$/u, "")
    .trim();
}

export function normalizeSiteNamePrefix(prefix) {
  let name = stripSiteSuffix(String(prefix || "").replace(/\s+/g, ""));
  name = dedupeRepeatedSuffix(name);

  for (const brand of APT_COMPLEX_BRANDS) {
    const brandRe = new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (brandRe.test(name)) {
      const idx = name.search(brandRe);
      const before = name.slice(0, idx);
      const brandPart = name.slice(idx, idx + brand.length);
      const after = name.slice(idx + brand.length);
      name = dedupeRepeatedSuffix([before, brandPart, after].filter(Boolean).join(""));
      break;
    }
  }

  return dedupeRepeatedSuffix(name);
}

export function isNoiseLine(line) {
  const s = String(line || "").trim();
  if (!s) return true;
  if (OCR_NOISE_LINE_RE.test(s)) return true;
  if (STATUS_TIME_RE.test(s)) return true;
  if (/^\d{1,3}\s*%$/.test(s)) return true;
  if (KEYBOARD_GARBAGE_RE.test(s)) return true;
  if (/^[ㄱ-ㅎㅏ-ㅣ]+$/u.test(s)) return true;
  if (/^(메시지\s*입력|전송|검색|카메라|갤러리)$/u.test(s)) return true;
  return false;
}

export function filterSiteLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !isNoiseLine(line));
}

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function scoreMatch({ building, unit, siteName, lineIndex, line }) {
  let score = 0;
  const bLen = building.length;
  const uLen = unit.length;
  if (bLen >= 3 && bLen <= 4) score += 0.35;
  if (uLen >= 2 && uLen <= 4) score += 0.25;
  if (siteName && siteName.length >= 2) score += 0.2 + Math.min(0.15, siteName.length / 30);
  if (/[가-힣]{2,}/u.test(siteName)) score += 0.1;
  if (lineIndex === 0) score += 0.05;
  if (/(\d{3,4})동(\d{2,4})호/u.test(compactBlob(line))) score += 0.1;
  return score;
}

function collectMatchesFromText(text, lineIndex = -1) {
  const matches = [];
  const compact = compactBlob(text);
  if (!compact) return matches;

  for (const re of [DONG_HO_COMPACT_RE, DONG_HO_SPACED_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(compact)) !== null) {
      const building = digitsOnly(m[1]);
      const unit = digitsOnly(m[2]);
      if (building.length < 3 || unit.length < 2) continue;

      const prefix = compact.slice(0, m.index);
      const siteName = normalizeSiteNamePrefix(prefix);
      if (!siteName || siteName.length < 2) continue;

      matches.push({
        siteName,
        building,
        unit,
        lineIndex,
        line: text,
        score: scoreMatch({ building, unit, siteName, lineIndex, line: text }),
        source: "compact_dong_ho",
      });
    }
  }

  return matches;
}

/**
 * @param {string} text
 * @returns {{
 *   rawText: string,
 *   normalizedText: string,
 *   filteredLines: string[],
 *   siteName: string,
 *   building: string,
 *   unit: string,
 *   siteNameCandidates: string[],
 *   buildingCandidates: string[],
 *   unitCandidates: string[],
 *   final: { siteName: string, building: string, unit: string, title: string },
 *   debug: object,
 * }}
 */
export function parseSiteFields(text, options = {}) {
  const rawText = String(text || "").trim();
  const normalizedText = normalizeOcrBlob(rawText);
  const filteredLines = options.skipFilter ? normalizedText.split(/\n/).map((l) => l.trim()).filter(Boolean) : filterSiteLines(rawText);
  const lines = filteredLines.length ? filteredLines : rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const allMatches = [];
  lines.forEach((line, index) => {
    allMatches.push(...collectMatchesFromText(line, index));
  });
  if (!allMatches.length) {
    allMatches.push(...collectMatchesFromText(compactBlob(rawText), -1));
  }

  allMatches.sort((a, b) => b.score - a.score);
  const best = allMatches[0] || null;

  const siteNameCandidates = [...new Set(allMatches.map((m) => m.siteName).filter(Boolean))];
  const buildingCandidates = [...new Set(allMatches.map((m) => m.building).filter(Boolean))];
  const unitCandidates = [...new Set(allMatches.map((m) => m.unit).filter(Boolean))];

  const siteName = best?.siteName || "";
  const building = best?.building || "";
  const unit = best?.unit || "";
  const title = buildSiteTitle({ siteName, building, unit });

  const result = {
    rawText,
    normalizedText,
    filteredLines,
    siteName,
    building,
    unit,
    siteNameCandidates,
    buildingCandidates,
    unitCandidates,
    final: { siteName, building, unit, title },
    hasUnit: Boolean(building && unit),
    hasSiteName: Boolean(siteName && siteName.length >= 2),
    structureOk: Boolean(siteName && building && unit),
    matchCount: allMatches.length,
    debug: {
      matches: allMatches.slice(0, 8).map((m) => ({
        siteName: m.siteName,
        building: m.building,
        unit: m.unit,
        score: Number(m.score.toFixed(3)),
        lineIndex: m.lineIndex,
        line: m.line?.slice(0, 80),
      })),
      bestScore: best?.score ?? 0,
    },
  };

  if (options.debug === true || isStructureDebugEnabled()) {
    logSiteFieldParse(result, options.label);
  }

  return result;
}

export function buildSiteTitle({ siteName, building, unit }) {
  const apt = String(siteName || "").trim();
  const dong = digitsOnly(building);
  const ho = digitsOnly(unit);
  if (!dong || !ho) return apt || "";
  const aptPart = apt ? `${apt} ` : "";
  return `${aptPart}${dong}동 ${ho}호`.replace(/\s+/g, " ").trim();
}

export function logSiteFieldParse(result, label = "site-field-parser") {
  if (typeof console === "undefined" || !console.groupCollapsed) return;
  const header = `[${label}] structureOk=${result.structureOk}`;
  console.groupCollapsed(header);
  console.log("OCR 원문:", result.rawText);
  console.log("정규화:", result.normalizedText);
  console.log("필터 줄:", result.filteredLines);
  console.log("현장명 후보:", result.siteNameCandidates);
  console.log("동 후보:", result.buildingCandidates);
  console.log("호 후보:", result.unitCandidates);
  console.log("최종 선택:", result.final);
  console.log("매칭 상세:", result.debug?.matches);
  console.groupEnd();
}
