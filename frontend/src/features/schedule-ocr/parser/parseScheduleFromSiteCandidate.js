import { parseScheduleImport, SCHEDULE_IMPORT_SOURCE } from "../../../utils/schedulePasteParser";
import { applyScheduleImportTitleToForm } from "../utils/scheduleFormApplyTitle";
import { parseSiteFields, buildSiteTitle } from "../../site-import/parser/siteFieldParser";

/**
 * 사용자가 고른 현장 후보 줄 + 전체 OCR 텍스트로 일정 import 결과 생성
 */
export function parseScheduleImportFromSiteCandidate(fullText, candidateLine, options = {}) {
  const line = String(candidateLine || "").trim();
  const text = String(fullText || "").trim();
  if (!line) {
    return parseScheduleImport(
      { source: SCHEDULE_IMPORT_SOURCE.OCR, text, ocrRawText: text },
      options
    );
  }

  const lineParse = parseSiteFields(line, { label: "site-candidate-line" });
  const fullResult = parseScheduleImport(
    {
      source: SCHEDULE_IMPORT_SOURCE.OCR,
      text,
      ocrRawText: text,
      selectedSiteLine: line,
    },
    options
  );

  const building = lineParse.building || fullResult.structureTrace?.building || "";
  const unit = lineParse.unit || fullResult.structureTrace?.unit || "";
  const siteName =
    fullResult.structureTrace?.debug?.selectedSite ||
    lineParse.siteName ||
    fullResult.structureTrace?.siteName ||
    "";

  let title = "";
  if (building && unit) {
    title = buildSiteTitle({ siteName, building, unit });
  } else if (siteName) {
    title = siteName;
  } else {
    title = line.slice(0, 48);
  }

  const merged = {
    ...fullResult,
    title,
    finalTitle: title,
    resolvedTitle: building && unit ? title : fullResult.resolvedTitle,
    structureOk: Boolean(building && unit) || fullResult.structureOk,
    selectedSiteLine: line,
    structureTrace: {
      ...fullResult.structureTrace,
      siteName,
      building: building || fullResult.structureTrace?.building,
      unit: unit || fullResult.structureTrace?.unit,
      structureOk: Boolean(building && unit) || fullResult.structureOk,
      selectedSiteLine: line,
    },
    structureMetrics: {
      siteName,
      building,
      unit,
    },
    resolvedTitleSource: building && unit ? { apartmentName: siteName, building, unit } : fullResult.resolvedTitleSource,
  };

  const appliedTitle = applyScheduleImportTitleToForm(merged, { log: true });
  if (appliedTitle) {
    merged.title = appliedTitle;
    merged.finalTitle = appliedTitle;
  }

  if (!merged.filledFields.includes("title") && merged.title) {
    merged.filledFields = [...merged.filledFields, "title"];
  }
  merged.ok = Boolean(merged.title && merged.dateKey);

  return merged;
}
