import { buildAddressLine, buildScheduleTitle, extractSiteInfo } from "../extractor/siteInfoExtractor";
import { structureSiteInfoWithGpt } from "../../../api/siteImportApi";
import { parsePastedFieldText } from "../../../utils/mapItemDraft";

/**
 * @typedef {Object} SiteStructuredInfo
 * @property {string} title
 * @property {string} apartmentName
 * @property {string} building
 * @property {string} unit
 * @property {string} commonPassword
 * @property {string} housePassword
 * @property {string[]} workItems
 * @property {number} confidence
 * @property {boolean} ok
 * @property {string} source
 * @property {string} [message]
 */

const MIN_UNIT_CONFIDENCE = 0.55;

function mergeStructured(rule, gpt) {
  if (!gpt || typeof gpt !== "object") return rule;
  const pick = (gptVal, ruleVal) => {
    const g = String(gptVal || "").trim();
    const r = String(ruleVal || "").trim();
    return g || r;
  };
  const building = pick(gpt.building, rule.building);
  const unit = pick(gpt.unit, rule.unit);
  const apartmentName = pick(gpt.apartmentName, rule.apartmentName);
  const merged = {
    apartmentName,
    building,
    unit,
    commonPassword: pick(gpt.commonPassword, rule.commonPassword),
    housePassword: pick(gpt.housePassword, rule.housePassword),
    workItems: Array.isArray(gpt.workItems) && gpt.workItems.length ? gpt.workItems : rule.workItems,
    brands: rule.brands,
    confidence: Math.max(Number(gpt.confidence) || 0, rule.confidence),
    hasUnit: Boolean(building && unit),
    rawText: rule.rawText,
  };
  merged.title = buildScheduleTitle(merged) || pick(gpt.title, "");
  return merged;
}

/**
 * @param {string} ocrText
 * @param {{ useGpt?: boolean, referenceDate?: Date }} [options]
 * @returns {Promise<SiteStructuredInfo>}
 */
export async function structureSiteInfo(ocrText, options = {}) {
  const extracted = extractSiteInfo(ocrText);
  let merged = extracted;
  let source = "rule";

  if (options.useGpt !== false && ocrText.trim().length >= 4) {
    try {
      const gpt = await structureSiteInfoWithGpt({ text: ocrText, ruleHint: extracted });
      if (gpt?.ok) {
        merged = mergeStructured(extracted, gpt.data);
        source = gpt.source || "gpt";
      }
    } catch (_) {
      /* GPT optional — rule fallback */
    }
  }

  const title = buildScheduleTitle(merged);
  const ok = merged.hasUnit && merged.confidence >= MIN_UNIT_CONFIDENCE;

  if (!ok) {
    return {
      title: "",
      apartmentName: merged.apartmentName || "",
      building: merged.building || "",
      unit: merged.unit || "",
      commonPassword: merged.commonPassword || "",
      housePassword: merged.housePassword || "",
      workItems: merged.workItems || [],
      brands: merged.brands || [],
      confidence: merged.confidence,
      ok: false,
      source,
      message: "현장 정보를 찾지 못했습니다",
    };
  }

  return {
    title,
    apartmentName: merged.apartmentName,
    building: merged.building,
    unit: merged.unit,
    commonPassword: merged.commonPassword,
    housePassword: merged.housePassword,
    workItems: merged.workItems || [],
    brands: merged.brands || [],
    confidence: merged.confidence,
    ok: true,
    source,
    message: "",
  };
}

/**
 * QuickSiteImportSheet용 quickPatch 생성
 * @param {SiteStructuredInfo} structured
 * @param {string} ocrText
 * @param {string} [selectedDateKey]
 */
export function structuredInfoToFormPatch(structured, ocrText, selectedDateKey = "") {
  if (!structured?.ok) {
    return { patch: {}, structured, applied: false };
  }

  const pasted = parsePastedFieldText(ocrText, selectedDateKey);
  const accessPassword =
    structured.commonPassword ||
    structured.housePassword ||
    pasted.accessPassword?.value ||
    "";

  const passwordParts = [];
  if (structured.commonPassword) passwordParts.push(`공동 ${structured.commonPassword}`);
  if (structured.housePassword) passwordParts.push(`세대 ${structured.housePassword}`);

  const workDesc = [
    ...(structured.workItems || []),
    ...(structured.brands || []).map((b) => `${b} 자재`),
  ]
    .filter(Boolean)
    .join(" · ");

  const fullAddress = buildAddressLine(structured) || pasted.address?.fullAddress || "";

  const patch = {
    title: structured.title,
    accessPassword,
    location: fullAddress
      ? {
          fullAddress,
          shortRegion: fullAddress.split(/\s+/).slice(0, 2).join(" "),
          siteKind: /아파트/u.test(fullAddress) ? "아파트" : "현장",
        }
      : undefined,
    requiredItems: workDesc || pasted.requiredItems?.value || undefined,
  };

  if (pasted.workDate?.value) patch.workDate = pasted.workDate.value;
  if (pasted.workDateEnd?.value) patch.workDateEnd = pasted.workDateEnd.value;
  if (pasted.workTime?.value) patch.workTime = pasted.workTime.value;
  if (pasted.craft?.value) patch.craft = pasted.craft.value;
  if (pasted.crewCount?.value) patch.crewCount = pasted.crewCount.value;
  if (pasted.payAmount?.value) patch.payAmount = pasted.payAmount.value;

  return { patch, structured, applied: true };
}
