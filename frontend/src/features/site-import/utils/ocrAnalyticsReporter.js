import { reportSiteMemoryEvent } from "../../../api/siteMemoryApi";
import { extractSiteInfo } from "../extractor/siteInfoExtractor";

export const OCR_SOURCE = {
  VISION: "gemini-vision",
  TESSERACT: "tesseract-fallback",
};

/** 일정 등록 경로 — Analytics KPI */
export const IMPORT_SOURCE = {
  TEXT_PASTE: "text-paste",
  OCR_VISION: "gemini-vision",
  OCR_TESSERACT: "tesseract-fallback",
};

export const OCR_RESULT_REASON = {
  OK: "ok",
  MISSING_APARTMENT: "missing_apartment",
  MISSING_BUILDING: "missing_building",
  MISSING_UNIT: "missing_unit",
  STRUCTURE_FAILED: "structure_failed",
};

function buildOcrFieldFlags({ apartmentName, building, unit } = {}) {
  return {
    hasApartmentName: Boolean(String(apartmentName || "").trim()),
    hasBuilding: Boolean(String(building || "").trim()),
    hasUnit: Boolean(String(unit || "").trim()),
  };
}

export function buildExtractedTitle({ apartmentName, building, unit, title } = {}) {
  const explicit = String(title || "").trim();
  if (explicit && /\d+\s*동/.test(explicit)) return explicit;
  const apt = String(apartmentName || "").trim();
  const b = String(building || "").trim();
  const u = String(unit || "").trim();
  if (b && u) {
    return `${apt ? `${apt} ` : ""}${b}동 ${u}호`.trim();
  }
  return explicit || apt;
}

export function buildResultReason({ success, hasApartmentName, hasBuilding, hasUnit } = {}) {
  if (success) return OCR_RESULT_REASON.OK;
  if (!hasBuilding && !hasUnit) return OCR_RESULT_REASON.STRUCTURE_FAILED;
  if (!hasBuilding) return OCR_RESULT_REASON.MISSING_BUILDING;
  if (!hasUnit) return OCR_RESULT_REASON.MISSING_UNIT;
  if (!hasApartmentName) return OCR_RESULT_REASON.MISSING_APARTMENT;
  return OCR_RESULT_REASON.STRUCTURE_FAILED;
}

function parseTitleFields(title) {
  const info = extractSiteInfo(String(title || ""));
  return {
    apartmentName: info.apartmentName || "",
    building: info.building || "",
    unit: info.unit || "",
  };
}

/** OCR 시도/성공 이벤트 — 원문·비밀번호 미저장 */
export function reportOcrAttempt({
  ocrSource = OCR_SOURCE.TESSERACT,
  success = false,
  apartmentName = "",
  building = "",
  unit = "",
  confidence = null,
  region = "",
  craft = "",
  title = "",
  matchSource = "none",
} = {}) {
  const flags = buildOcrFieldFlags({ apartmentName, building, unit });
  const extractedTitle = buildExtractedTitle({ apartmentName, building, unit, title });
  const resultReason = buildResultReason({ success, ...flags });

  reportSiteMemoryEvent({
    eventType: success ? "ocr_success" : "ocr_attempt",
    ocrSource,
    success: Boolean(success),
    displayName: apartmentName,
    canonicalKey: apartmentName,
    building,
    unit,
    confidence: confidence != null ? Number(confidence) : null,
    hasApartmentName: flags.hasApartmentName,
    hasBuilding: flags.hasBuilding,
    hasUnit: flags.hasUnit,
    userEdited: false,
    matchSource,
    region,
    craft,
    siteNameRaw: apartmentName || extractedTitle,
    ocrTitleExtracted: extractedTitle,
    ocrTitleOriginal: extractedTitle,
    resultReason,
  });
}

export function reportTextPasteAttempt(chatResult) {
  if (!chatResult) return;
  const trace = chatResult.structureTrace || {};
  const metrics = chatResult.structureMetrics || {};
  reportOcrAttempt({
    ocrSource: IMPORT_SOURCE.TEXT_PASTE,
    success: Boolean(chatResult.structureOk),
    apartmentName: trace.siteName || metrics.siteName || "",
    building: trace.building || metrics.building || "",
    unit: trace.unit || metrics.unit || "",
    confidence: chatResult.parseDiagnostics?.confidence,
    title: chatResult.title || "",
    craft: trace.craft || chatResult.pasteMeta?.craft || "",
  });
}

export function reportOcrAttemptFromVisionDiag(diag, extras = {}) {
  if (!diag) return;
  reportOcrAttempt({
    ocrSource: OCR_SOURCE.VISION,
    success: diag.structureStatus === "success" || Boolean(diag.building && diag.unit),
    apartmentName: diag.apartmentName,
    building: diag.building,
    unit: diag.unit,
    confidence: diag.confidence,
    title: diag.apartmentName ? `${diag.apartmentName} ${diag.building}동 ${diag.unit}호` : "",
    ...extras,
  });
}

export function reportOcrAttemptFromChatResult(chatResult, { ocrSource = OCR_SOURCE.TESSERACT } = {}) {
  if (!chatResult) return;
  const trace = chatResult.structureTrace || {};
  const metrics = chatResult.structureMetrics || {};
  reportOcrAttempt({
    ocrSource,
    success: Boolean(chatResult.structureOk),
    apartmentName: trace.siteName || metrics.siteName || "",
    building: trace.building || metrics.building || "",
    unit: trace.unit || metrics.unit || "",
    confidence: chatResult.parseDiagnostics?.confidence,
    title: chatResult.title || "",
  });
}

/** OCR 적용 직후 스냅샷 — 저장 시 수정 여부 비교용 */
export function createOcrApplySnapshot({
  ocrSource = OCR_SOURCE.TESSERACT,
  title = "",
  apartmentName = "",
  building = "",
  unit = "",
  confidence = null,
} = {}) {
  const parsed = parseTitleFields(title);
  const extractedTitle = buildExtractedTitle({
    apartmentName: apartmentName || parsed.apartmentName,
    building: building || parsed.building,
    unit: unit || parsed.unit,
    title,
  });
  return {
    id: `ocr-snap-${Date.now()}`,
    ocrSource: ocrSource || OCR_SOURCE.TESSERACT,
    title: extractedTitle,
    apartmentName: String(apartmentName || parsed.apartmentName || "").trim(),
    building: String(building || parsed.building || "").trim(),
    unit: String(unit || parsed.unit || "").trim(),
    confidence: confidence != null ? Number(confidence) : null,
  };
}

/** 저장 시 OCR 수정 이벤트 + 익명 교정 쌍 */
export function reportOcrUserEdit(snapshot, finalState = {}) {
  if (!snapshot) return;

  const finalTitle = String(finalState.title || "").trim();
  const parsedFinal = parseTitleFields(finalTitle);
  const finalFields = {
    apartmentName: String(finalState.apartmentName || parsedFinal.apartmentName || "").trim(),
    building: String(finalState.building || parsedFinal.building || "").trim(),
    unit: String(finalState.unit || parsedFinal.unit || "").trim(),
  };

  const userEditedTitle = finalTitle !== snapshot.title;
  const userEditedBuilding = finalFields.building !== snapshot.building;
  const userEditedUnit = finalFields.unit !== snapshot.unit;
  const anyEdit = userEditedTitle || userEditedBuilding || userEditedUnit;

  reportSiteMemoryEvent({
    eventType: "ocr_edit",
    ocrSource: snapshot.ocrSource,
    success: true,
    displayName: finalFields.apartmentName || snapshot.apartmentName,
    canonicalKey: finalFields.apartmentName || snapshot.apartmentName,
    building: finalFields.building || snapshot.building,
    unit: finalFields.unit || snapshot.unit,
    confidence: snapshot.confidence,
    hasApartmentName: Boolean(finalFields.apartmentName || snapshot.apartmentName),
    hasBuilding: Boolean(finalFields.building || snapshot.building),
    hasUnit: Boolean(finalFields.unit || snapshot.unit),
    userEdited: anyEdit,
    userEditedTitle,
    userEditedBuilding,
    userEditedUnit,
    ocrTitleOriginal: snapshot.title || null,
    ocrTitleCorrected: userEditedTitle ? finalTitle : snapshot.title,
    ocrTitleExtracted: snapshot.title || null,
    resultReason: anyEdit ? "user_edited" : OCR_RESULT_REASON.OK,
    siteNameRaw: snapshot.apartmentName || snapshot.title,
  });
}

export function ocrSourceFromVisionDiag(diag) {
  return diag?.engine === "gemini-vision" ? OCR_SOURCE.VISION : OCR_SOURCE.TESSERACT;
}

export function importSourceFromResult(result) {
  if (result?.importSource) return result.importSource;
  if (result?.visionOcrDiag?.engine === "gemini-vision") return IMPORT_SOURCE.OCR_VISION;
  return IMPORT_SOURCE.TEXT_PASTE;
}
