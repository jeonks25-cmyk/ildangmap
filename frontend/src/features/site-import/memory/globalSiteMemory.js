import { fetchGlobalSiteMemoryMatch } from "../../../api/siteMemoryApi";

/** 서버 공용 Memory → normalizer 후보 형식 */
export async function fetchGlobalMemoryCandidates({
  rawName,
  building,
  region,
  craft,
  limit = 3,
}) {
  const { candidates } = await fetchGlobalSiteMemoryMatch({
    query: rawName,
    building,
    region,
    craft,
    limit,
  });

  return candidates.map((c) => ({
    name: c.name,
    score: Number(c.score) || 0,
    source: "global",
    detail: c.detail || `등록 ${c.registrationCount || 0}회`,
    scorePercent: c.scorePercent ?? Math.round((Number(c.score) || 0) * 100),
    registrationCount: c.registrationCount,
    canonicalKey: c.canonicalKey,
    region: c.region,
  }));
}
