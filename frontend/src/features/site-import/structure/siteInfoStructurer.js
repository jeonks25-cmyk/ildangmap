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
import { normalizeSiteName, AUTO_SELECT_THRESHOLD } from "../normalizer/siteNameNormalizer";
import { extractExplicitWorkTimes } from "../parser/workTimeExtractor";
import { joinWorkTimeParts } from "../../../utils/fieldSiteScheduleParser";
import {
  applySiteMemoryCorrection,
  buildMemorySiteNameCandidates,
  buildSiteMemoryRecommendation,
  mergeMemoryCandidates,
  syncSiteMemoryFromSchedules,
  loadSiteMemory,
} from "../memory";
import { fetchGlobalMemoryCandidates } from "../memory/globalSiteMemory";
import { reportSiteMemoryEvent } from "../../../api/siteMemoryApi";
import {
  buildExtractedTitle,
  buildResultReason,
} from "../utils/ocrAnalyticsReporter";

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

function toStructuredPayload(merged, source, normalization = null, memoryContext = null) {
  const needsSiteNameSelection = Boolean(normalization?.needsSelection);
  const apartmentName = needsSiteNameSelection
    ? merged.apartmentName
    : normalization?.normalizedName || merged.apartmentName;

  const titleMerged = { ...merged, apartmentName };
  const title = needsSiteNameSelection ? "" : buildScheduleTitle(titleMerged);
  const checklist = buildSiteVerificationChecklist({ ...merged, apartmentName });
  if (normalization?.needsSelection) {
    const aptRow = checklist.find((row) => row.key === "apartment");
    if (aptRow) {
      aptRow.status = "warn";
      aptRow.detail = `${normalization.rawName} — 후보 선택`;
    }
  } else if (
    normalization?.autoSelected &&
    normalization.normalizedName &&
    normalization.normalizedName !== normalization.rawName
  ) {
    const aptRow = checklist.find((row) => row.key === "apartment");
    if (aptRow) {
      aptRow.detail = normalization.normalizedName;
    }
  }
  const ok = merged.hasUnit && merged.confidence >= MIN_UNIT_CONFIDENCE;

  const siteNameBlock = normalization
    ? {
        siteNameRaw: normalization.rawName,
        siteNameNormalized: normalization.normalizedName,
        siteNameAutoSelected: normalization.autoSelected,
        needsSiteNameSelection,
        siteNameCandidates: normalization.candidates || [],
        siteNameConfidence: normalization.confidence,
      }
    : {};

  const memoryBlock = memoryContext?.memoryMatch
    ? { memoryMatch: memoryContext.memoryMatch }
    : {};

  if (!ok) {
    return {
      title: "",
      apartmentName: apartmentName || "",
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
      ...siteNameBlock,
      ...memoryBlock,
    };
  }

  return {
    title,
    apartmentName,
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
    ...siteNameBlock,
    ...memoryBlock,
  };
}

/**
 * @param {string} ocrText
 * @param {{ useGpt?: boolean, referenceDate?: Date, selectedDateKey?: string }} [options]
 */
export async function structureSiteInfo(ocrText, options = {}) {
  const userId = options.userId || "me";
  let siteMemory =
    options.siteMemory ||
    (options.schedules?.length
      ? syncSiteMemoryFromSchedules(userId, options.schedules)
      : loadSiteMemory(userId));

  let extracted = extractSiteInfo(ocrText);
  let memoryMatch = null;

  if (siteMemory) {
    const memoryResult = applySiteMemoryCorrection(extracted, ocrText, siteMemory);
    extracted = memoryResult.extracted;
    memoryMatch = memoryResult.memoryMatch;
    if (memoryResult.memoryBoost > 0) {
      extracted.confidence = Math.min(0.98, (extracted.confidence || 0) + memoryResult.memoryBoost * 0.08);
    }
  }

  extracted = enrichWithCraft(extracted, ocrText);
  let merged = extracted;
  let source = memoryMatch ? "memory+rule" : "rule";

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

  let normalization = null;
  let globalMemoryMatch = null;
  const activityRegion = options.activityRegions?.[0] || "";

  if (merged.apartmentName && merged.apartmentName.length >= 2) {
    const globalCandidates = await fetchGlobalMemoryCandidates({
      rawName: merged.apartmentName,
      building: merged.building,
      region: activityRegion,
      craft: merged.craft,
      limit: 5,
    });

    const topGlobal = globalCandidates[0];
    if (topGlobal?.score >= AUTO_SELECT_THRESHOLD) {
      merged = { ...merged, apartmentName: topGlobal.name };
      globalMemoryMatch = topGlobal;
      memoryMatch = memoryMatch || {
        siteName: topGlobal.name,
        score: topGlobal.score,
        registrationCount: topGlobal.registrationCount,
        source: "global",
      };
      merged.confidence = Math.min(0.98, (merged.confidence || 0) + 0.08);
      source = "global+rule";
    }

    normalization = await normalizeSiteName({
      rawName: merged.apartmentName,
      building: merged.building,
      unit: merged.unit,
      ocrText,
      activityRegions: options.activityRegions,
      recentAddresses: options.recentAddresses,
      kakao: options.kakao,
    });
    if (normalization.autoSelected && normalization.normalizedName && !globalMemoryMatch) {
      merged = { ...merged, apartmentName: normalization.normalizedName };
      if (normalization.confidence > 0.8) {
        merged.confidence = Math.min(0.98, merged.confidence + 0.06);
      }
    }

    const personalCandidates = siteMemory
      ? buildMemorySiteNameCandidates(
          normalization.rawName || merged.apartmentName,
          merged.building,
          siteMemory
        )
      : [];
    const mergedCandidates = mergeMemoryCandidates(
      mergeMemoryCandidates(personalCandidates, globalCandidates),
      normalization.candidates
    );

    if (mergedCandidates.length) {
      const top = mergedCandidates[0];
      const autoSelected = top?.score >= AUTO_SELECT_THRESHOLD;
      normalization = {
        ...normalization,
        candidates: mergedCandidates,
        autoSelected: autoSelected || normalization.autoSelected,
        normalizedName: autoSelected ? top.name : normalization.normalizedName,
        needsSelection: !autoSelected && mergedCandidates.length >= 2,
        confidence: Math.max(normalization.confidence || 0, top?.score || 0),
      };
      if (autoSelected) {
        merged = { ...merged, apartmentName: top.name };
        if (top.source === "global") globalMemoryMatch = top;
      }
    }
  }

  const multiSchedules = parseMultiSchedules(ocrText, {
    referenceDate: options.referenceDate,
    defaultDateKey: options.selectedDateKey,
  });

  const payload = toStructuredPayload(merged, source, normalization, { memoryMatch });
  const recommendation = buildSiteMemoryRecommendation(payload, siteMemory);

  const matchSource = globalMemoryMatch
    ? "global"
    : memoryMatch?.source === "personalDict"
      ? "personal"
      : source.includes("gpt")
        ? "gpt"
        : normalization?.autoSelected
          ? "pattern"
          : "none";

  reportSiteMemoryEvent({
    eventType: payload.ok ? "ocr_success" : "ocr_attempt",
    canonicalKey: payload.apartmentName || normalization?.rawName || "",
    displayName: payload.apartmentName || "",
    matchSource,
    region: activityRegion,
    craft: payload.craft || merged.craft || "",
    building: payload.building || "",
    unit: payload.unit || "",
    success: Boolean(payload.ok),
    userEdited: false,
    siteNameRaw: payload.apartmentName || "",
    ocrSource: options.ocrSource || "tesseract-fallback",
    confidence: payload.confidence,
    hasApartmentName: Boolean(payload.apartmentName),
    hasBuilding: Boolean(payload.building),
    hasUnit: Boolean(payload.unit),
    ocrTitleExtracted: buildExtractedTitle({
      apartmentName: payload.apartmentName,
      building: payload.building,
      unit: payload.unit,
    }),
    ocrTitleOriginal: buildExtractedTitle({
      apartmentName: payload.apartmentName,
      building: payload.building,
      unit: payload.unit,
    }),
    resultReason: buildResultReason({
      success: Boolean(payload.ok),
      hasApartmentName: Boolean(payload.apartmentName),
      hasBuilding: Boolean(payload.building),
      hasUnit: Boolean(payload.unit),
    }),
  });

  return {
    ...payload,
    structureTrace: extracted.structureTrace || null,
    structureOk: extracted.structureOk || Boolean(payload.ok),
    metricsSessionId: extracted.metricsSessionId || null,
    siteMemoryRecommendation: recommendation,
    globalMemoryMatch,
    matchSource,
    multiSchedules: multiSchedules.length >= 2 ? multiSchedules : [],
  };
}

export function structuredInfoToFormPatch(structured, ocrText, selectedDateKey = "", selectedSiteName = "") {
  if (!structured?.ok) {
    return { patch: {}, structured, applied: false };
  }

  const pasted = parsePastedFieldText(ocrText, selectedDateKey);
  const workDesc = (structured.workItems || []).filter(Boolean).join(" · ");
  const aptForTitle = selectedSiteName || (structured.needsSiteNameSelection ? "" : structured.apartmentName);
  const title = buildScheduleTitle({
    apartmentName: aptForTitle,
    building: structured.building,
    unit: structured.unit,
  });
  const fullAddress =
    buildAddressLine({ ...structured, apartmentName: aptForTitle }) ||
    pasted.address?.fullAddress ||
    "";

  const patch = {
    title,
    accessPassword: structured.commonPassword || pasted.accessPassword?.value || "",
    housePassword: structured.housePassword || "",
    craft:
      structured.craft ||
      structured.siteMemoryRecommendation?.craft ||
      pasted.craft?.value ||
      undefined,
    calendarColor: structured.siteMemoryRecommendation?.calendarColor || undefined,
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
  const explicitTime = extractExplicitWorkTimes(ocrText);
  if (explicitTime.extracted && explicitTime.startTime && explicitTime.endTime) {
    patch.workTime = joinWorkTimeParts(explicitTime.startTime, explicitTime.endTime);
  }
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
