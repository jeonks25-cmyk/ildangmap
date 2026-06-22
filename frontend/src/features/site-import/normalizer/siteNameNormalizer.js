import { searchKakaoPlaces } from "../../../utils/mapPlaceSearch";
import { normalizeActivityRegions } from "../../../constants/activityRegions";
import {
  APT_COMPLEX_BRANDS,
  BRAND_ALIASES,
  KNOWN_COMPLEXES,
  expandBrandAliases,
  extractNeighborhoodToken,
} from "./siteNameDictionary";
import {
  compactHangul,
  findBestBrandMatch,
  fuzzySimilarity,
  stripApartmentSuffix,
} from "./fuzzyMatch";

export const AUTO_SELECT_THRESHOLD = 0.85;
export const MAX_CANDIDATES = 3;
const MIN_CANDIDATE_SCORE = 0.38;

function uniqCandidates(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const key = compactHangul(item.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function scoreKnownComplex(complex, rawName, building, activityRegions, neighborhood) {
  const ocrCompact = compactHangul(rawName);
  const names = [complex.name, ...(complex.aliases || [])];
  let nameScore = 0;
  for (const n of names) {
    nameScore = Math.max(nameScore, fuzzySimilarity(ocrCompact, n));
  }

  let regionBoost = 0;
  if (activityRegions.includes(complex.city)) regionBoost += 0.18;
  if (neighborhood && complex.neighborhood === neighborhood) regionBoost += 0.12;

  const brandMatch = findBestBrandMatch(rawName, APT_COMPLEX_BRANDS, BRAND_ALIASES);
  let brandBoost = 0;
  if (brandMatch && complex.brand && brandMatch.brand === complex.brand) {
    brandBoost = 0.1 + brandMatch.score * 0.08;
  }

  const score = Math.min(0.99, nameScore * 0.72 + regionBoost + brandBoost);
  return {
    name: complex.name,
    score,
    source: "dictionary",
    detail: `${complex.city}${complex.neighborhood ? ` ${complex.neighborhood}동` : ""}`,
    city: complex.city,
    neighborhood: complex.neighborhood || "",
    brand: complex.brand || "",
  };
}

function scoreKakaoPlace(place, rawName, building, activityRegions) {
  const placeName = stripApartmentSuffix(place.placeName || place.title || "");
  if (!placeName) return null;

  const addr = `${place.roadAddress || ""} ${place.jibunAddress || ""} ${place.address || ""}`;
  const nameScore = fuzzySimilarity(rawName, placeName);
  const addrScore = fuzzySimilarity(rawName, addr) * 0.35;
  let regionBoost = 0;
  for (const city of activityRegions) {
    if (addr.includes(city) || placeName.includes(city)) {
      regionBoost = 0.12;
      break;
    }
  }

  let dongBoost = 0;
  if (building && (addr.includes(`${building}동`) || placeName.includes(`${building}동`))) {
    dongBoost = 0.08;
  }

  const aptBoost = /아파트|APT|단지|리슈빌|푸르지오|계룡|힐스테이트/iu.test(placeName) ? 0.06 : 0;

  const score = Math.min(0.99, nameScore * 0.58 + addrScore + regionBoost + dongBoost + aptBoost);
  if (score < MIN_CANDIDATE_SCORE) return null;

  return {
    name: placeName,
    score,
    source: "kakao",
    detail: place.roadAddress || place.jibunAddress || place.address || "",
    city: activityRegions.find((c) => addr.includes(c) || placeName.includes(c)) || "",
    fullAddress: place.roadAddress || place.jibunAddress || place.address || "",
    lat: place.lat,
    lng: place.lng,
  };
}

function scoreBrandCanonical(rawName, activityRegions, neighborhood) {
  const expanded = expandBrandAliases(rawName);
  const brandMatch = findBestBrandMatch(expanded, APT_COMPLEX_BRANDS, BRAND_ALIASES);
  if (!brandMatch) return null;

  const prefix = neighborhood || extractNeighborhoodToken(rawName);
  const canonical = prefix ? `${prefix}${brandMatch.brand}` : brandMatch.brand;
  const display = prefix ? `${prefix}${brandMatch.brand}아파트` : `${brandMatch.brand}아파트`;

  let regionBoost = 0;
  if (activityRegions.length && (activityRegions.includes("천안") || activityRegions.includes("아산"))) {
    regionBoost = 0.08;
  }

  const score = Math.min(0.88, brandMatch.score * 0.78 + regionBoost);
  return {
    name: display,
    score,
    source: "brand",
    detail: canonical,
    brand: brandMatch.brand,
  };
}

function buildSearchQueries(rawName, building, activityRegions, neighborhood) {
  const queries = [];
  const city = activityRegions[0] || "";
  const nh = neighborhood || extractNeighborhoodToken(rawName);
  const expanded = expandBrandAliases(rawName);

  if (city && nh) queries.push(`${city} ${nh} ${expanded} 아파트`);
  if (city) queries.push(`${city} ${expanded} 아파트`);
  if (building) queries.push(`${expanded} ${building}동`);
  queries.push(`${expanded} 아파트`);
  if (nh) queries.push(`${nh}${expanded}`);

  return [...new Set(queries.map((q) => q.replace(/\s+/g, " ").trim()).filter(Boolean))].slice(0, 4);
}

async function fetchKakaoCandidates(queries, kakao, rawName, building, activityRegions) {
  if (!kakao?.maps?.services?.Places) return [];

  const merged = [];
  for (const query of queries) {
    const places = await searchKakaoPlaces(kakao, query);
    for (const place of places) {
      const scored = scoreKakaoPlace(place, rawName, building, activityRegions);
      if (scored) merged.push(scored);
    }
  }
  return merged;
}

/**
 * OCR 현장명 정규화 — fuzzy + 지역 + 카카오 DB
 * @param {{ rawName: string, building?: string, unit?: string, ocrText?: string, activityRegions?: string[], recentAddresses?: string[], kakao?: object }} input
 */
export async function normalizeSiteName(input = {}) {
  const rawName = String(input.rawName || "").trim();
  const building = String(input.building || "").replace(/\D/g, "");
  const activityRegions = normalizeActivityRegions(input.activityRegions, []);
  const neighborhood = extractNeighborhoodToken(rawName) || extractNeighborhoodToken(input.ocrText || "");

  if (!rawName || rawName.length < 2) {
    return {
      rawName,
      normalizedName: "",
      autoSelected: false,
      needsSelection: false,
      confidence: 0,
      candidates: [],
    };
  }

  const candidates = [];

  for (const complex of KNOWN_COMPLEXES) {
    const scored = scoreKnownComplex(complex, rawName, building, activityRegions, neighborhood);
    if (scored.score >= MIN_CANDIDATE_SCORE) candidates.push(scored);
  }

  const brandCandidate = scoreBrandCanonical(rawName, activityRegions, neighborhood);
  if (brandCandidate) candidates.push(brandCandidate);

  const recentBlob = (input.recentAddresses || [])
    .map((a) => String(a.fullAddress || a.label || a.shortRegion || "").trim())
    .filter(Boolean)
    .join(" ");

  if (recentBlob) {
    for (const complex of KNOWN_COMPLEXES) {
      if (!recentBlob.includes(complex.neighborhood || "") && !recentBlob.includes(complex.name)) continue;
      const scored = scoreKnownComplex(complex, rawName, building, activityRegions, neighborhood);
      scored.score = Math.min(0.99, scored.score + 0.06);
      scored.source = "recent";
      candidates.push(scored);
    }
  }

  const queries = buildSearchQueries(rawName, building, activityRegions, neighborhood);
  const kakaoCandidates = await fetchKakaoCandidates(
    queries,
    input.kakao,
    rawName,
    building,
    activityRegions
  );
  candidates.push(...kakaoCandidates);

  const rawCandidate = {
    name: stripApartmentSuffix(rawName),
    score: fuzzySimilarity(rawName, expandBrandAliases(rawName)) * 0.62,
    source: "ocr",
    detail: "OCR 원문",
  };
  candidates.push(rawCandidate);

  const ranked = uniqCandidates(candidates)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CANDIDATES)
    .map((c) => ({
      ...c,
      scorePercent: Math.round(Math.min(99, c.score * 100)),
    }));

  const top = ranked[0];
  const autoSelected = Boolean(top && top.score >= AUTO_SELECT_THRESHOLD);
  const normalizedName = autoSelected ? top.name : rawName;

  return {
    rawName,
    normalizedName,
    autoSelected,
    needsSelection: !autoSelected && ranked.length >= 2,
    confidence: top?.score || 0,
    candidates: ranked,
    matchedBrand: findBestBrandMatch(rawName, APT_COMPLEX_BRANDS, BRAND_ALIASES)?.brand || "",
    matchedNeighborhood: neighborhood,
    matchedRegion: activityRegions[0] || "",
  };
}
