import { getDefaultImportDateKey } from "../../../utils/schedulePasteParser";

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function buildTitle(apartmentName, building, unit) {
  if (!building || !unit) return String(apartmentName || "").trim();
  const apt = apartmentName ? `${apartmentName.trim()} ` : "";
  return `${apt}${building}동 ${unit}호`.trim();
}

/**
 * Gemini Vision 응답 → 일정 붙여넣기/OCR 파서 결과 형태
 */
export function visionResponseToScheduleImport(data, { referenceDate } = {}) {
  const building = digitsOnly(data?.building);
  const unit = digitsOnly(data?.unit);
  const apartmentName = String(data?.apartmentName || "").trim();
  const title = String(data?.title || "").trim() || buildTitle(apartmentName, building, unit);
  const workItems = Array.isArray(data?.workItems) ? data.workItems.map((v) => String(v || "").trim()).filter(Boolean) : [];
  const structureOk = Boolean(building && unit);
  const confidence = Number(data?.confidence) || 0.85;

  const memoLines = [];
  if (data?.commonPassword) memoLines.push(`공동비밀번호: ${String(data.commonPassword).trim()}`);
  if (data?.housePassword) memoLines.push(`세대비밀번호: ${String(data.housePassword).trim()}`);
  if (workItems.length) memoLines.push(...workItems);

  const filledFields = ["dateKey"];
  if (title) filledFields.push("title");
  if (memoLines.length) filledFields.push("memo");
  if (structureOk) filledFields.push("structureOk");

  return {
    ok: structureOk || Boolean(title),
    title,
    finalTitle: title,
    resolvedTitle: title,
    structureOk,
    structureTrace: {
      siteName: apartmentName,
      building,
      unit,
      structureOk,
      source: "gemini-vision",
      matchCount: structureOk ? 2 : 0,
    },
    structureMetrics: {
      siteName: apartmentName,
      building,
      unit,
    },
    memo: memoLines.join("\n"),
    dateKey: getDefaultImportDateKey(referenceDate || new Date()),
    filledFields,
    source: "vision",
    parseDiagnostics: {
      source: "gemini-vision",
      confidence,
    },
    warnings: structureOk ? [] : ["AI Vision: 동·호를 확인해 주세요."],
  };
}

/**
 * Gemini Vision 응답 → 현장 import structureSiteInfo 결과 형태
 */
export function visionResponseToStructured(data) {
  const building = digitsOnly(data?.building);
  const unit = digitsOnly(data?.unit);
  const apartmentName = String(data?.apartmentName || "").trim();
  const title = String(data?.title || "").trim() || buildTitle(apartmentName, building, unit);
  const workItems = Array.isArray(data?.workItems) ? data.workItems.map((v) => String(v || "").trim()).filter(Boolean) : [];
  const confidence = Number(data?.confidence) || 0.85;
  const hasUnit = Boolean(building && unit);

  return {
    ok: hasUnit && confidence >= 0.55,
    apartmentName,
    building,
    unit,
    commonPassword: String(data?.commonPassword || "").trim(),
    housePassword: String(data?.housePassword || "").trim(),
    workItems,
    title,
    confidence,
    hasUnit,
    source: "gemini-vision",
    message: hasUnit ? "" : "현장 정보를 찾지 못했습니다",
  };
}
