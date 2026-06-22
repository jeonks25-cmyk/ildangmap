import { buildSiteTitle } from "../../site-import/parser/siteFieldParser";

const DIAG = "[SCHEDULE-OCR]";

/** building+unit(±아파트명) 기반 제목 — OCR 첫 줄과 무관하게 재계산 */
export function buildStructureResolvedTitle(result) {
  const apt = String(
    result?.resolvedTitleSource?.apartmentName ||
      result?.structureMetrics?.siteName ||
      result?.structureTrace?.siteName ||
      ""
  ).trim();
  const building = String(
    result?.resolvedTitleSource?.building ||
      result?.structureMetrics?.building ||
      result?.structureTrace?.building ||
      ""
  ).trim();
  const unit = String(
    result?.resolvedTitleSource?.unit ||
      result?.structureMetrics?.unit ||
      result?.structureTrace?.unit ||
      ""
  ).trim();
  if (!building || !unit) return "";
  return buildSiteTitle({ siteName: apt, building, unit });
}

/**
 * 파서·OCR 결과 → 폼 title input에 넣을 최종 문자열
 * resolvedTitle(동·호) > parsedTitle > legacyTitle > parser finalTitle
 */
export function applyScheduleImportTitleToForm(result, options = {}) {
  const log = options.log !== false;
  const resolvedTitle =
    String(result?.resolvedTitle || "").trim() || buildStructureResolvedTitle(result);
  const parsedTitle = String(result?.parsedTitle || "").trim();
  const legacyTitle = String(result?.legacyTitle || "").trim();
  const parserFinalTitle = String(result?.finalTitle || result?.title || "").trim();

  const finalAppliedTitle =
    resolvedTitle || parsedTitle || legacyTitle || parserFinalTitle || "";

  if (log) {
    console.log(`${DIAG} form apply title`, {
      resolvedTitle,
      parsedTitle,
      legacyTitle,
      parserFinalTitle,
      finalAppliedTitle,
      titlePath: result?.titleDiag?.path || result?.parseDiagnostics?.titlePath || null,
    });
  }

  if (
    parserFinalTitle &&
    finalAppliedTitle &&
    parserFinalTitle !== finalAppliedTitle &&
    resolvedTitle
  ) {
    console.error("[BUG] finalTitle was overwritten before form apply", {
      parserFinalTitle,
      finalAppliedTitle,
      resolvedTitle,
      parsedTitle,
      legacyTitle,
    });
  }

  return finalAppliedTitle;
}
