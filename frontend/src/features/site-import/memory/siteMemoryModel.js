import { compactHangul, fuzzySimilarity } from "../normalizer/fuzzyMatch";

const DONG_HO_RE = /(\d{3,4})\s*동\s*(\d{2,4})\s*호/u;
const DONG_HO_COMPACT_RE = /(\d{3,4})동(\d{2,4})호/u;
const APT_SUFFIX_RE = /(아파트|APT|apt|오피스텔|빌라|빌딩|타워|단지)/iu;
const VENDOR_SUFFIX_RE = /(인테리어|건설|디자인|하우징|홈|공사|타일|필름)$/u;

export function normalizeSiteMemoryKey(siteName) {
  return compactHangul(stripSiteSuffix(siteName));
}

export function stripSiteSuffix(value) {
  return String(value || "")
    .replace(APT_SUFFIX_RE, "")
    .replace(/\d+\s*동$/u, "")
    .trim();
}

/** "장재계룡 1109동 1402호" → site/building/unit */
export function parseSiteTitleParts(title) {
  const raw = String(title || "").trim();
  if (!raw) {
    return { siteName: "", building: "", unit: "", rawTitle: "" };
  }

  const compact = raw.replace(/\s+/g, "");
  const match =
    compact.match(DONG_HO_COMPACT_RE) ||
    raw.match(DONG_HO_RE);

  let building = "";
  let unit = "";
  let siteName = raw;

  if (match) {
    building = String(match[1] || "").replace(/\D/g, "");
    unit = String(match[2] || "").replace(/\D/g, "");
    if (match.index != null) {
      siteName = compact.slice(0, match.index);
    } else {
      siteName = raw.slice(0, raw.indexOf(match[0])).trim();
    }
  }

  siteName = stripSiteSuffix(siteName.replace(/\s+/g, ""));

  return { siteName, building, unit, rawTitle: raw };
}

/** OCR blob에서 동호 재파싱 — "장재계룡계룡1109동1402호" */
export function parseSitePartsFromBlob(blob) {
  const text = String(blob || "").replace(/\s+/g, "");
  const match = text.match(DONG_HO_COMPACT_RE);
  if (!match) return parseSiteTitleParts(blob);
  const building = String(match[1] || "").replace(/\D/g, "");
  const unit = String(match[2] || "").replace(/\D/g, "");
  const prefix = text.slice(0, match.index);
  return {
    siteName: stripSiteSuffix(prefix),
    building,
    unit,
    rawTitle: blob,
  };
}

export function detectVendorNames(text, knownVendors = []) {
  const blob = String(text || "");
  const found = [];
  for (const name of knownVendors) {
    if (!name) continue;
    if (blob.includes(name)) found.push(name);
  }
  const vendorMatch = blob.match(/([가-힣A-Za-z0-9]{2,12}(?:인테리어|건설|디자인|하우징))/u);
  if (vendorMatch && !found.includes(vendorMatch[1])) found.push(vendorMatch[1]);
  return [...new Set(found)];
}

export function detectOyajiNames(text, knownOyajis = []) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const found = [];

  for (const name of knownOyajis) {
    if (name && String(text || "").includes(name)) found.push(name);
  }

  for (const line of lines.slice(0, 3)) {
    const m = line.match(/^([가-힣]{2,4})(?:\s*[:：]|\s+오\d|\s*$)/u);
    if (m && !found.includes(m[1])) found.push(m[1]);
  }

  return [...new Set(found)].slice(0, 3);
}

export function detectPersonalTerms(text) {
  const blob = String(text || "");
  const terms = [];
  const vendorMatch = blob.match(/([가-힣A-Za-z0-9]{2,12}(?:인테리어|건설|디자인|하우징))/gu);
  (vendorMatch || []).forEach((v) => terms.push({ term: v, type: "vendor" }));
  const nameMatches = blob.match(/(?:^|\n|\s)([가-힣]{2,4})(?=\s*[:：]|\s+010|\s*$)/gu);
  (nameMatches || []).forEach((raw) => {
    const term = String(raw).trim();
    if (term.length >= 2 && term.length <= 4) terms.push({ term, type: "oyaji" });
  });
  return terms;
}

export function scoreSiteMemoryMatch(rawName, building, siteRecord) {
  if (!siteRecord?.siteName) return 0;
  const key = normalizeSiteMemoryKey(siteRecord.siteName);
  const compact = compactHangul(rawName);
  let score = fuzzySimilarity(compact, key);

  if (building && siteRecord.buildings?.[building]) {
    const freq = siteRecord.buildings[building] / Math.max(1, siteRecord.registrationCount || 1);
    score += 0.12 + Math.min(0.12, freq * 0.25);
  }

  score += Math.min(0.08, (siteRecord.registrationCount || 0) / 120);
  return Math.min(0.99, score);
}

export function isLikelyBuildingForSite(building, siteRecord) {
  if (!building || !siteRecord?.buildings) return false;
  if (siteRecord.buildings[building]) return true;
  const nums = Object.keys(siteRecord.buildings)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n));
  if (!nums.length) return false;
  const target = Number(building);
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return target >= min - 2 && target <= max + 2;
}

export function guessVendorType(name) {
  return VENDOR_SUFFIX_RE.test(String(name || "")) ? "vendor" : "oyaji";
}
