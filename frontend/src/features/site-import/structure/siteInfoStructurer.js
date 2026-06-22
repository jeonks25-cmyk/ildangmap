import {
  buildAddressLine,
  buildScheduleTitle,
  buildSiteVerificationChecklist,
  extractSiteInfo,
} from "../extractor/siteInfoExtractor";
import { inferCraftFromText } from "../extractor/craftInference";
import { parseMultiSchedules } from "../extractor/multiScheduleParser";
import { structureSiteInfoWithGpt } from "../../../api/siteImportApi";
import { parsePastedFieldText } from "../../../utils/mapItemDraft";

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
  const craft = pick(gpt.craft, rule.craft) || rule.craft;
  const merged = {
    apartmentName,
    building,
    unit,
    commonPassword: pick(gpt.commonPassword, rule.commonPassword),
    housePassword: pick(gpt.housePassword, rule.housePassword),
    workItems: Array.isArray(gpt.workItems) && gpt.workItems.length ? gpt.workItems : rule.workItems,
    brands: rule.brands,
    craft,
    craftConfidence: rule.craftConfidence,
    craftMatched: rule.craftMatched,
    confidence: Math.max(Number(gpt.confidence) || 0, rule.confidence),
    hasUnit: Boolean(building && unit),
    rawText: rule.rawText,
  };
  merged.title = buildScheduleTitle(merged) || pick(gpt.title, "");
  return merged;
}

function enrichWithCraft(merged, ocrText) {
  if (merged.craft) return merged;
  const inferred = inferCraftFromText(ocrText);
  if (inferred.craft) {
    return {
      ...merged,
      craft: inferred.craft,
      craftConfidence: inferred.confidence,
      craftMatched: inferred.matched,
    };
  }
  return merged;
}

function toStructuredPayload(merged, source) {
  const title = buildScheduleTitle(merged);
  const checklist = buildSiteVerificationChecklist(merged);
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
      craft: merged.craft || null,
      confidence: merged.confidence,
      checklist,
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
    craft: merged.craft || null,
    confidence: merged.confidence,
    checklist,
    ok: true,
    source,
    message: "",
  };
}

/**
 * @param {string} ocrText
 * @param {{ useGpt?: boolean, referenceDate?: Date, selectedDateKey?: string }} [options]
 */
export async function structureSiteInfo(ocrText, options = {}) {
  let extracted = extractSiteInfo(ocrText);
  extracted = enrichWithCraft(extracted, ocrText);
  let merged = extracted;
  let source = "rule";

  if (options.useGpt !== false && ocrText.trim().length >= 4) {
    try {
      const gpt = await structureSiteInfoWithGpt({ text: ocrText, ruleHint: extracted });
      if (gpt?.ok) {
        merged = mergeStructured(extracted, gpt.data);
        merged = enrichWithCraft(merged, ocrText);
        source = gpt.source || "gpt";
      }
    } catch (_) {
      /* GPT optional */
    }
  }

  const multiSchedules = parseMultiSchedules(ocrText, {
    referenceDate: options.referenceDate,
    defaultDateKey: options.selectedDateKey,
  });

  const payload = toStructuredPayload(merged, source);
  return {
    ...payload,
    multiSchedules: multiSchedules.length >= 2 ? multiSchedules : [],
  };
}

export function structuredInfoToFormPatch(structured, ocrText, selectedDateKey = "") {
  if (!structured?.ok) {
    return { patch: {}, structured, applied: false };
  }

  const pasted = parsePastedFieldText(ocrText, selectedDateKey);
  const workDesc = (structured.workItems || []).filter(Boolean).join(" · ");
  const fullAddress = buildAddressLine(structured) || pasted.address?.fullAddress || "";

  const patch = {
    title: structured.title,
    accessPassword: structured.commonPassword || pasted.accessPassword?.value || "",
    housePassword: structured.housePassword || "",
    craft: structured.craft || pasted.craft?.value || undefined,
    location: fullAddress
      ? {
          fullAddress,
          shortRegion: fullAddress.split(/\s+/).slice(0, 2).join(" "),
          siteKind: "아파트",
        }
      : undefined,
    requiredItems: workDesc || pasted.requiredItems?.value || undefined,
  };

  if (pasted.workDate?.value) patch.workDate = pasted.workDate.value;
  if (pasted.workDateEnd?.value) patch.workDateEnd = pasted.workDateEnd.value;
  if (pasted.workTime?.value) patch.workTime = pasted.workTime.value;
  if (pasted.crewCount?.value) patch.crewCount = pasted.crewCount.value;
  if (pasted.payAmount?.value) patch.payAmount = pasted.payAmount.value;

  return { patch, structured, applied: true };
}

export function multiScheduleRowToFormPatch(row, basePatch = {}) {
  const title = row.title || buildScheduleTitle(row);
  return {
    title,
    accessPassword: row.commonPassword || basePatch.accessPassword || "",
    housePassword: row.housePassword || basePatch.housePassword || "",
    craft: row.craft || basePatch.craft,
    workDate: row.dateKey || basePatch.workDate,
    workDateEnd: row.dateKey || basePatch.workDateEnd,
    location: title
      ? {
          fullAddress: title,
          shortRegion: title.split(/\s+/).slice(0, 2).join(" "),
          siteKind: "아파트",
        }
      : basePatch.location,
    requiredItems: (row.workItems || []).join(" · ") || basePatch.requiredItems,
  };
}
