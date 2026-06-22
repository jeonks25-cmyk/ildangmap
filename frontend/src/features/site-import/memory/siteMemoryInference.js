import { CRAFT_LABEL } from "../../../utils/jobModel";
import { getScheduleColorOption, resolveFieldScheduleColor } from "../../../constants/scheduleColors";
import { compactHangul, fuzzySimilarity } from "../normalizer/fuzzyMatch";
import { dedupeRepeatedSuffix } from "../extractor/siteInfoExtractor";
import {
  detectOyajiNames,
  detectVendorNames,
  isLikelyBuildingForSite,
  parseSitePartsFromBlob,
  scoreSiteMemoryMatch,
} from "./siteMemoryModel";
import { getSiteMemoryRecord, listSiteMemorySites } from "./siteMemoryStorage";

function pickTopCraft(craftCounts, fallback = "") {
  const entries = Object.entries(craftCounts || {}).sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] || fallback;
}

function topParticipantNames(participantNames, limit = 3) {
  return Object.entries(participantNames || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);
}

function findBestSiteMatch(rawName, building, memory) {
  const sites = listSiteMemorySites(memory);
  let best = null;

  for (const site of sites) {
    const score = scoreSiteMemoryMatch(rawName, building, site);
    if (!best || score > best.score) {
      best = { site, score };
    }
  }

  return best && best.score >= 0.68 ? best : null;
}

function applyOyajiPasswordStyle(extracted, ocrText, memory) {
  const oyajiNames = detectOyajiNames(
    ocrText,
    Object.entries(memory?.personalDict || {})
      .filter(([, v]) => v?.type === "oyaji")
      .map(([k]) => k)
  );
  if (!oyajiNames.length) return extracted;

  const sender = oyajiNames[0];
  const style = memory?.oyajiStyles?.[sender];
  if (!style) return extracted;

  let commonPassword = extracted.commonPassword;
  let housePassword = extracted.housePassword;

  if (!commonPassword && style.commonAliases?.length) {
    for (const alias of style.commonAliases) {
      const re = new RegExp(`${alias}\\s*[:：]?\\s*([#*\\d]{3,8})`, "iu");
      const m = String(ocrText || "").match(re);
      if (m) {
        commonPassword = m[1];
        break;
      }
    }
  }

  if (!housePassword && style.houseAliases?.length) {
    for (const alias of style.houseAliases) {
      const re = new RegExp(`${alias}\\s*[:：]?\\s*([#*\\d]{3,10})`, "iu");
      const m = String(ocrText || "").match(re);
      if (m) {
        housePassword = m[1];
        break;
      }
    }
  }

  return {
    ...extracted,
    commonPassword: commonPassword || extracted.commonPassword,
    housePassword: housePassword || extracted.housePassword,
    memoryOyaji: sender,
  };
}

function applyVendorCraft(extracted, ocrText, memory) {
  const vendors = detectVendorNames(
    ocrText,
    Object.keys(memory?.vendors || {})
  );
  if (!vendors.length) return extracted;

  const vendorName = vendors[0];
  const vendor = memory.vendors[vendorName];
  if (!vendor?.craft || extracted.craft) return { ...extracted, memoryVendor: vendorName };

  return {
    ...extracted,
    craft: vendor.craft,
    craftConfidence: Math.max(extracted.craftConfidence || 0, 0.78),
    memoryVendor: vendorName,
  };
}

/**
 * OCR 추출 결과를 사용자 현장 기억으로 보정
 */
export function applySiteMemoryCorrection(extracted, ocrText, memory) {
  if (!memory || !extracted) return { extracted, memoryMatch: null, memoryBoost: 0 };

  let next = { ...extracted };
  const blobParts = parseSitePartsFromBlob(ocrText || extracted.rawText || "");
  if (blobParts.building && blobParts.unit) {
    next.building = next.building || blobParts.building;
    next.unit = next.unit || blobParts.unit;
    if (blobParts.siteName) {
      next.apartmentName = next.apartmentName || blobParts.siteName;
    }
  }

  next = applyOyajiPasswordStyle(next, ocrText, memory);
  next = applyVendorCraft(next, ocrText, memory);

  const rawName = dedupeRepeatedSuffix(next.apartmentName || blobParts.siteName || "");
  const match = findBestSiteMatch(rawName, next.building, memory);

  if (match?.site) {
    const site = match.site;
    next.apartmentName = site.siteName;
    if (next.building && isLikelyBuildingForSite(next.building, site)) {
      next.memoryBuildingConfirmed = true;
    } else if (!next.building && site.lastBuilding) {
      next.building = site.lastBuilding;
    }

    if (!next.craft && site.recentCraft) {
      next.craft = site.recentCraft;
      next.craftConfidence = 0.82;
    }

    let confidence = Math.min(0.98, (next.confidence || 0) + match.score * 0.12);
    if (next.memoryBuildingConfirmed) confidence = Math.min(0.98, confidence + 0.04);
    next.confidence = confidence;

    return {
      extracted: next,
      memoryMatch: {
        siteName: site.siteName,
        score: match.score,
        registrationCount: site.registrationCount,
        buildings: Object.keys(site.buildings || {}),
        recentCraft: site.recentCraft,
      },
      memoryBoost: match.score,
    };
  }

  const personalSites = Object.entries(memory.personalDict || {})
    .filter(([, v]) => v?.type === "site")
    .map(([k]) => k);
  for (const term of personalSites) {
    if (fuzzySimilarity(rawName, term) >= 0.82) {
      next.apartmentName = term;
      next.confidence = Math.min(0.95, (next.confidence || 0) + 0.08);
      return {
        extracted: next,
        memoryMatch: { siteName: term, score: 0.82, source: "personalDict" },
        memoryBoost: 0.08,
      };
    }
  }

  return { extracted: next, memoryMatch: null, memoryBoost: 0 };
}

/**
 * 현장 기억 기반 일정 추천
 */
export function buildSiteMemoryRecommendation(structured, memory, selectedSiteName = "") {
  if (!structured?.ok || !memory) return null;

  const siteName = selectedSiteName || structured.apartmentName || structured.siteNameRaw || "";
  const site = getSiteMemoryRecord(memory, siteName);
  if (!site && !siteName) return null;

  const craft = structured.craft || site?.recentCraft || pickTopCraft(site?.craftCounts);
  const calendarColor = site?.calendarColor || resolveFieldScheduleColor({ craft, calendarColor: site?.calendarColor });
  const colorOption = getScheduleColorOption(calendarColor);
  const participants = topParticipantNames(site?.participantNames, 3);

  const title =
    structured.title ||
    (siteName && structured.building && structured.unit
      ? `${siteName} ${structured.building}동 ${structured.unit}호`
      : site?.lastTitle || "");

  return {
    title,
    craft,
    craftLabel: CRAFT_LABEL[craft] || craft || "",
    calendarColor,
    colorLabel: colorOption.label,
    colorBg: colorOption.bg,
    participants,
    siteName: site?.siteName || siteName,
    registrationCount: site?.registrationCount || 0,
    knownBuildings: Object.keys(site?.buildings || {}).slice(0, 8),
    source: site ? "memory" : "inferred",
  };
}

/** 기억 기반 현장명 후보 추가 */
export function buildMemorySiteNameCandidates(rawName, building, memory, limit = 3) {
  if (!memory) return [];
  const sites = listSiteMemorySites(memory);
  return sites
    .map((site) => ({
      name: site.siteName,
      score: scoreSiteMemoryMatch(rawName, building, site),
      source: "memory",
      detail: `등록 ${site.registrationCount || 0}회 · ${pickTopCraft(site.craftCounts, site.recentCraft) || "공정"}`,
      scorePercent: Math.round(scoreSiteMemoryMatch(rawName, building, site) * 100),
    }))
    .filter((c) => c.score >= 0.55)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** OCR blob에서 개인 사전 용어 매칭 */
export function matchPersonalDictionaryTerms(text, memory) {
  const blob = String(text || "");
  const hits = [];
  Object.entries(memory?.personalDict || {}).forEach(([term, meta]) => {
    if (!term || !blob.includes(term)) return;
    hits.push({ term, type: meta?.type || "unknown", count: meta?.count || 0 });
  });
  return hits.sort((a, b) => b.count - a.count);
}

export function mergeMemoryCandidates(existingCandidates, memoryCandidates) {
  const merged = [...(memoryCandidates || []), ...(existingCandidates || [])];
  const seen = new Set();
  return merged
    .filter((c) => {
      const key = compactHangul(c.name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 3)
    .map((c) => ({
      ...c,
      scorePercent: c.scorePercent ?? Math.round((c.score || 0) * 100),
    }));
}
