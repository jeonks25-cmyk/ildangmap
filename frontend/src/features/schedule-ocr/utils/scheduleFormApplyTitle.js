import {
  buildSiteTitle,
  pickPlausibleApartmentName,
} from "../../site-import/parser/siteFieldParser";
import { isExcludedTitleCandidate } from "../../../utils/schedulePasteParser";

const DIAG = "[SCHEDULE-OCR]";

function getStructureFields(result) {
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
  const siteNameCandidates = [
    result?.structureTrace?.debug?.selectedSite,
    result?.resolvedTitleSource?.apartmentName,
    result?.structureMetrics?.siteName,
    result?.structureTrace?.siteName,
    ...(result?.structureTrace?.siteNameCandidates || []),
    ...(result?.structureMetrics?.siteNameCandidates || []),
  ];
  return { building, unit, siteNameCandidates };
}

/** building+unit(±검증된 아파트명) 기반 제목 — OCR 첫 줄과 무관하게 재계산 */
export function buildStructureResolvedTitle(result) {
  const { building, unit, siteNameCandidates } = getStructureFields(result);
  if (!building || !unit) return "";
  const apt = pickPlausibleApartmentName(...siteNameCandidates);
  return buildSiteTitle({ siteName: apt, building, unit });
}

/**
 * 파서·OCR 결과 → 폼 title input에 넣을 최종 문자열
 * 동·호 있으면 structure 제목만 사용 (parsedTitle/legacy로 덮어쓰지 않음)
 */
export function applyScheduleImportTitleToForm(result, options = {}) {
  const log = options.log !== false;
  const { building, unit } = getStructureFields(result);
  const structuralTitle = buildStructureResolvedTitle(result);

  const parserResolved = String(result?.resolvedTitle || "").trim();
  const resolvedTitle =
    parserResolved &&
    !isExcludedTitleCandidate(parserResolved) &&
    (!building || !unit || parserResolved.includes(`${building}동`))
      ? parserResolved
      : structuralTitle;

  const parsedTitle = String(result?.parsedTitle || "").trim();
  const legacyTitle = String(result?.legacyTitle || "").trim();
  const parserFinalTitle = String(result?.finalTitle || result?.title || "").trim();

  let finalAppliedTitle;
  const titlePath = result?.titleDiag?.path || result?.parseDiagnostics?.titlePath || "";
  const parserTitle = String(result?.title || "").trim();

  if (building && unit && (!titlePath || titlePath.startsWith("priority3_"))) {
    finalAppliedTitle = structuralTitle || resolvedTitle || "";
    if (
      !finalAppliedTitle &&
      parserFinalTitle &&
      !isExcludedTitleCandidate(parserFinalTitle) &&
      parserFinalTitle.includes(`${building}동`)
    ) {
      finalAppliedTitle = parserFinalTitle;
    }
  } else {
    finalAppliedTitle =
      (parserTitle && !isExcludedTitleCandidate(parserTitle) ? parserTitle : "") ||
      resolvedTitle ||
      (parsedTitle && !isExcludedTitleCandidate(parsedTitle) ? parsedTitle : "") ||
      (legacyTitle && !isExcludedTitleCandidate(legacyTitle) ? legacyTitle : "") ||
      (parserFinalTitle && !isExcludedTitleCandidate(parserFinalTitle) ? parserFinalTitle : "") ||
      structuralTitle ||
      "";
  }

  if (log) {
    console.log(`${DIAG} form apply title`, {
      resolvedTitle: structuralTitle || resolvedTitle,
      parsedTitle,
      legacyTitle,
      parserFinalTitle,
      finalAppliedTitle,
      titlePath: result?.titleDiag?.path || result?.parseDiagnostics?.titlePath || null,
      building,
      unit,
    });
  }

  if (
    parserFinalTitle &&
    finalAppliedTitle &&
    parserFinalTitle !== finalAppliedTitle &&
    building &&
    unit
  ) {
    console.error("[BUG] finalTitle was overwritten before form apply", {
      parserFinalTitle,
      finalAppliedTitle,
      structuralTitle,
      resolvedTitle,
      parsedTitle,
      legacyTitle,
    });
  }

  return finalAppliedTitle;
}
