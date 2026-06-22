/**
 * 현장 특화 구조화 파서 — OCR/붙여넣기 공통
 * 장재계룡계룡1109동1402호 → 현장명·동·호 분리
 */

import { APT_COMPLEX_BRANDS } from "../normalizer/siteNameDictionary";
import { isStructureDebugEnabled } from "./siteImportStructureMetrics";

const DONG_HO_COMPACT_RE = /(\d{3,4})동(\d{2,4})호/gu;
const DONG_HO_SPACED_RE = /(\d{3,4})\s*동\s*(\d{2,4})\s*호/gu;
const DONG_UNIT_COMPACT_RE = /(\d{3,4})동(\d{2,4})(?!\d)/gu;
const DONG_UNIT_SPACED_RE = /(\d{3,4})\s*동\s*(\d{2,4})(?!\d)/gu;
const DONG_UNIT_LINE_RE = /^(\d{3,4})\s*동\s*(\d{2,4})\s*호?\.?$/u;
const APT_SUFFIX_RE = /(아파트|APT|apt|오피스텔|빌라|빌딩|타워|단지)/iu;
const OCR_NOISE_LINE_RE =
  /^(KT|SKT|LG\s*U\+|5G|LTE|Wi-Fi|WiFi|Md&@p|[\W_]{1,6})$/i;
const STATUS_BAR_RE = /^(KT|SKT|LG\s*U\+).*\d{1,2}:\d{2}/i;
const STATUS_TIME_RE = /^(\d{1,2}:\d{2}|오전\s*\d|오후\s*\d|»)/;
const KEYBOARD_GARBAGE_RE = /^[a-z]{1,3}$/i;
const HANGUL_SITE_LINE_RE = /^[가-힣A-Za-z0-9]{2,24}$/u;

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

/** OCR 노이즈 접두에서 한글 현장명만 추출 (KT12:52…장재계룡QQ → 장재계룡) */
function extractHangulSiteNameFromGarbage(text) {
  const runs = String(text || "").match(/[가-힣]{2,10}/gu) || [];
  for (const run of runs) {
    const cleaned = dedupeRepeatedSuffix(run);
    if (isPlausibleSiteName(cleaned)) return cleaned;
  }
  return "";
}

export function pickPlausibleApartmentName(...candidates) {
  const seen = new Set();
  for (const raw of candidates.flat()) {
    const n = String(raw || "").trim();
    if (!n || seen.has(n)) continue;
    seen.add(n);
    if (isPlausibleSiteName(n)) return n;
  }
  return "";
}

/** OCR 흔한 오인식 정규화 */
export function normalizeOcrSiteText(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[｜|»·•]/g, " ")
    .replace(/[东同둥冬]/g, "동")
    .replace(/(\d{2,4})\s*(?:호|흐|Ho|HO)(?!\d)/gi, "$1호")
    .replace(/(\d{3,4})\s*동/g, "$1동")
    .replace(/(\d)l(\d)/gi, "$11$2")
    .replace(/(\d)[|I](\d)/g, "$11$2")
    .replace(/[oO](\d{3})(동)/g, "0$1$2");
}

export function normalizeOcrBlob(text) {
  return normalizeOcrSiteText(text).replace(/\s+/g, " ").trim();
}

export function compactBlob(text) {
  return normalizeOcrSiteText(text).replace(/\s+/g, "");
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

  name = dedupeRepeatedSuffix(name);

  if (!isPlausibleSiteName(name)) {
    const extracted = extractHangulSiteNameFromGarbage(prefix);
    if (extracted) name = extracted;
  }

  return dedupeRepeatedSuffix(name);
}

export function isNoiseLine(line) {
  const s = String(line || "").trim();
  if (!s) return true;
  if (STATUS_BAR_RE.test(s)) return true;
  if (OCR_NOISE_LINE_RE.test(s)) return true;
  if (STATUS_TIME_RE.test(s)) return true;
  if (/^\d{1,3}\s*%$/.test(s)) return true;
  if (KEYBOARD_GARBAGE_RE.test(s)) return true;
  if (/^[ㄱ-ㅎㅏ-ㅣ]+$/u.test(s)) return true;
  if (/^(메시지\s*입력|전송|검색|카메라|갤러리)$/u.test(s)) return true;
  if (/Md&@p|»|·/.test(s) && !/[가-힣]{2,}/u.test(s) && !/\d{3,4}동/u.test(s)) return true;
  if (s.length <= 2 && !/\d{3,}/.test(s) && !/[가-힣]{2,}/u.test(s)) return true;
  if (/^[\W\d\s:]{1,12}$/.test(s) && !/\d{3,4}동/u.test(s)) return true;
  if (/^(오전|오후)\s*\d{1,2}:\d{2}$/u.test(s)) return true;
  if (/^\d{1,2}:\d{2}$/.test(s)) return true;
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

function scoreMatch({ building, unit, siteName, lineIndex, line, source }) {
  let score = 0;
  const bLen = building.length;
  const uLen = unit.length;
  const uNum = parseInt(unit, 10);
  if (bLen >= 3 && bLen <= 4) score += 0.35;
  if (uLen >= 2 && uLen <= 4) score += 0.25;
  if (Number.isFinite(uNum) && uNum >= 100 && uNum <= 1999) score += 0.15;
  if (Number.isFinite(uNum) && uNum >= 2500) score -= 0.12;
  if (siteName && siteName.length >= 2) score += 0.2 + Math.min(0.15, siteName.length / 30);
  if (/[가-힣]{2,}/u.test(siteName)) score += 0.1;
  if (!isPlausibleSiteName(siteName)) score -= 0.45;
  if (lineIndex === 0) score += 0.03;
  if (/(\d{3,4})동(\d{2,4})/u.test(compactBlob(line))) score += 0.1;
  if (source === "compact_dong_ho") score += 0.08;
  if (source === "cross_line") score += 0.1;
  if (source === "full_blob") score -= 0.08;
  return score;
}

export function isPlausibleSiteName(name) {
  const n = String(name || "").trim();
  if (n.length < 2 || n.length > 18) return false;
  if (/^(KT|SKT|LG)/i.test(n)) return false;
  if (/[@&]|QQ|haC|연락처|인테리어|오전|오후|자세히/i.test(n)) return false;
  const hangul = (n.match(/[가-힣]/g) || []).length;
  if (hangul < 2) return false;
  if (hangul / n.length < 0.45) return false;
  return true;
}

/**
 * MVP structureOk — 동·호만 있으면 성공, 아파트명은 optional
 */
export function evaluateStructureOk({ siteName, building, unit, bestScore } = {}) {
  const apartmentName = String(siteName || "").trim();
  const hasBuilding = Boolean(String(building || "").trim());
  const hasUnit = Boolean(String(unit || "").trim());
  const structureOk = hasBuilding && hasUnit;

  const diag = {
    apartmentName,
    building: building || "",
    unit: unit || "",
    hasBuilding,
    hasUnit,
    hasSiteName: Boolean(apartmentName),
    structureOk,
    formula: "Boolean(building && unit)",
    bestScore: bestScore ?? null,
    legacyStrictWouldPass: Boolean(
      apartmentName && hasBuilding && hasUnit && isPlausibleSiteName(apartmentName) && (bestScore ?? 0) >= 0.55
    ),
  };

  if (typeof console !== "undefined" && console.log) {
    console.log("[SCHEDULE-OCR] structureOk 판정:", diag);
  }

  if (!structureOk && hasBuilding && hasUnit) {
    console.warn("[BUG] building/unit 추출 성공했는데 structure_failed 처리됨", diag);
  }

  return { structureOk, diag };
}

function pushMatch(matches, payload) {
  const { siteName, building, unit, lineIndex, line, source } = payload;
  if (!building || !unit) return;
  if (building.length < 3 || unit.length < 2) return;

  const hasSiteName = Boolean(siteName && siteName.length >= 2);
  if (!hasSiteName && source !== "dong_ho_only") return;
  if (hasSiteName && !isPlausibleSiteName(siteName)) {
    if (source === "full_blob" || source === "cross_line") return;
  }

  matches.push({
    siteName,
    building,
    unit,
    lineIndex,
    line,
    source,
    score: scoreMatch(payload),
  });
}

function collectFromRegex(text, lineIndex, patterns, source) {
  const matches = [];
  const compact = compactBlob(text);
  if (!compact) return matches;

  for (const re of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(compact)) !== null) {
      const building = digitsOnly(m[1]);
      const unit = digitsOnly(m[2]);
      const prefix = compact.slice(0, m.index);
      const siteName = normalizeSiteNamePrefix(prefix);
      pushMatch(matches, {
        siteName,
        building,
        unit,
        lineIndex,
        line: text,
        source,
      });
    }
  }
  return matches;
}

function collectDongHoOnlyMatches(lines) {
  const matches = [];
  const patterns = [
    DONG_HO_COMPACT_RE,
    DONG_HO_SPACED_RE,
    DONG_UNIT_COMPACT_RE,
    DONG_UNIT_SPACED_RE,
    DONG_UNIT_LINE_RE,
  ];

  lines.forEach((line, lineIndex) => {
    if (isNoiseLine(line)) return;
    const compact = compactBlob(line);

    for (const re of patterns) {
      re.lastIndex = 0;
      const m = re.exec(line) || (() => {
        re.lastIndex = 0;
        return re.exec(compact);
      })();
      if (!m) continue;

      pushMatch(matches, {
        siteName: "",
        building: digitsOnly(m[1]),
        unit: digitsOnly(m[2]),
        lineIndex,
        line,
        source: "dong_ho_only",
      });
      break;
    }
  });
  return matches;
}

function collectCrossLineMatches(lines) {
  const matches = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isNoiseLine(line)) continue;
    const compact = compactBlob(line);
    const m = compact.match(DONG_UNIT_LINE_RE) || compact.match(/^(\d{3,4})동(\d{2,4})호?$/u);
    if (!m) continue;

    let siteName = "";
    for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
      const prev = lines[j];
      if (isNoiseLine(prev)) continue;
      if (/\d{3,4}\s*동/u.test(prev)) continue;
      const prevCompact = compactBlob(prev);
      if (HANGUL_SITE_LINE_RE.test(prevCompact) || /[가-힣]{2,}/u.test(prevCompact)) {
        siteName = normalizeSiteNamePrefix(prevCompact);
        if (siteName.length >= 2) break;
      }
    }

    pushMatch(matches, {
      siteName,
      building: digitsOnly(m[1]),
      unit: digitsOnly(m[2]),
      lineIndex: i,
      line: line,
      source: "cross_line",
    });
  }
  return matches;
}

function collectMatchesFromText(text, lineIndex = -1) {
  const patterns = [DONG_HO_COMPACT_RE, DONG_HO_SPACED_RE, DONG_UNIT_COMPACT_RE, DONG_UNIT_SPACED_RE];
  return collectFromRegex(text, lineIndex, patterns, lineIndex < 0 ? "full_blob" : "compact_dong_ho");
}

function pickBestSiteMatch(matches) {
  if (!matches.length) return null;
  const top = matches[0];
  if (!top.building || !top.unit) return top;

  const peers = matches.filter((m) => m.building === top.building && m.unit === top.unit);
  const named = peers.find((m) => m.siteName && isPlausibleSiteName(m.siteName));
  if (named) return named;

  const nameless = peers.find((m) => !m.siteName);
  if (nameless) return nameless;

  if (top.siteName && !isPlausibleSiteName(top.siteName)) {
    return { ...top, siteName: "" };
  }
  return top;
}

/**
 * @param {string} text
 */
export function parseSiteFields(text, options = {}) {
  const rawText = String(text || "").trim();
  const normalizedText = normalizeOcrBlob(rawText);
  const filteredLines = options.skipFilter
    ? normalizedText.split(/\n/).map((l) => l.trim()).filter(Boolean)
    : filterSiteLines(rawText);
  const lines = filteredLines.length
    ? filteredLines
    : rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const allMatches = [];

  // 1) 전체 텍스트(줄바꿈 제거) — 붙어쓰기·OCR 분절 복구 (짧은 텍스트만)
  if (compactBlob(lines.join("")).length <= 120) {
    allMatches.push(...collectMatchesFromText(compactBlob(lines.join("")), -1));
  }
  allMatches.push(...collectMatchesFromText(normalizedText, -1));

  // 2) 줄 단위
  lines.forEach((line, index) => {
    allMatches.push(...collectMatchesFromText(line, index));
  });

  // 3) 인접 줄 — 현장명 / 동호 분리
  allMatches.push(...collectCrossLineMatches(lines));

  // 3b) 동·호만 있는 줄 (아파트명 없음)
  allMatches.push(...collectDongHoOnlyMatches(lines));

  // 4) 원문 fallback
  if (!allMatches.length) {
    allMatches.push(...collectMatchesFromText(compactBlob(rawText), -1));
  }

  allMatches.sort((a, b) => b.score - a.score);
  const best = pickBestSiteMatch(allMatches);

  const siteNameCandidates = [...new Set(allMatches.map((m) => m.siteName).filter(Boolean))];
  const buildingCandidates = [...new Set(allMatches.map((m) => m.building).filter(Boolean))];
  const unitCandidates = [...new Set(allMatches.map((m) => m.unit).filter(Boolean))];

  const siteName = best?.siteName || "";
  const building = best?.building || buildingCandidates[0] || "";
  const unit = best?.unit || unitCandidates[0] || "";
  const title = buildSiteTitle({ siteName, building, unit });

  const { structureOk, diag: structureOkDiag } = evaluateStructureOk({
    siteName,
    building,
    unit,
    bestScore: best?.score,
  });

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
    structureOk,
    structureOkDiag,
    matchCount: allMatches.length,
    debug: {
      matches: allMatches.slice(0, 10).map((m) => ({
        siteName: m.siteName,
        building: m.building,
        unit: m.unit,
        score: Number(m.score.toFixed(3)),
        lineIndex: m.lineIndex,
        source: m.source,
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
