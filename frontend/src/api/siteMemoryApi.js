import { runApiRequest } from "./client";

/**
 * 공용 현장 Memory 매칭 (서버 집계)
 * @returns {Promise<{ candidates: Array, total: number }>}
 */
export async function fetchGlobalSiteMemoryMatch({
  query = "",
  building = "",
  region = "",
  craft = "",
  limit = 5,
} = {}) {
  const q = String(query || "").trim();
  if (q.length < 2) return { candidates: [], total: 0 };

  const params = new URLSearchParams({ q, limit: String(limit) });
  if (building) params.set("building", building);
  if (region) params.set("region", region);
  if (craft) params.set("craft", craft);

  try {
    const data = await runApiRequest({
      path: `/api/site-memory/match?${params.toString()}`,
      method: "GET",
    });
    return {
      candidates: Array.isArray(data?.candidates) ? data.candidates : [],
      total: Number(data?.total) || 0,
    };
  } catch (_) {
    return { candidates: [], total: 0 };
  }
}

/**
 * 현장 Memory 이벤트 기록 (Analytics 기반 데이터)
 */
export async function recordSiteMemoryEvent(payload = {}) {
  try {
    return await runApiRequest({
      path: "/api/site-memory/events",
      method: "POST",
      body: payload,
    });
  } catch (_) {
    return null;
  }
}

/** OCR/등록 이벤트 — fire-and-forget */
export function reportSiteMemoryEvent(payload = {}) {
  void recordSiteMemoryEvent(payload);
}
