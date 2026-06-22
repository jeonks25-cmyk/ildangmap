import { runApiRequest } from "./client";
import { buildScheduleTitle, extractSiteInfo } from "../features/site-import/extractor/siteInfoExtractor";

/**
 * GPT 구조화 (백엔드). 실패 시 로컬 rule fallback.
 * @returns {Promise<{ ok: boolean, data?: object, source?: string }>}
 */
export async function structureSiteInfoWithGpt({ text, ruleHint } = {}) {
  const raw = String(text || "").trim();
  if (!raw) return { ok: false };

  try {
    const data = await runApiRequest({
      path: "/api/site-import/structure",
      method: "POST",
      body: { text: raw, ruleHint: ruleHint || null },
    });
    if (data && typeof data === "object" && (data.building || data.unit || data.title)) {
      return { ok: true, data, source: data.source || "gpt" };
    }
  } catch (_) {
    /* fall through */
  }

  const local = extractSiteInfo(raw);
  const title = buildScheduleTitle(local);
  if (!local.hasUnit) return { ok: false };
  return {
    ok: true,
    source: "rule_fallback",
    data: {
      title,
      apartmentName: local.apartmentName,
      building: local.building,
      unit: local.unit,
      commonPassword: local.commonPassword,
      housePassword: local.housePassword,
      workItems: local.workItems,
      confidence: local.confidence,
    },
  };
}
