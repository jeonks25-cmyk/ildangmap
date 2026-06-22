export const GEMINI_VISION_MODEL = "gemini-2.5-flash";

export function formatVisionConfidence(value) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  if (n <= 1) return `${Math.round(n * 100)}%`;
  return `${Math.round(n)}%`;
}

export function buildVisionOcrDiagFromVision(visionData = {}, chatResult = null) {
  const trace = chatResult?.structureTrace || {};
  return {
    engine: "gemini-vision",
    engineLabel: "Gemini Vision",
    banner: "Gemini Vision 사용됨",
    model: GEMINI_VISION_MODEL,
    structureStatus: "success",
    structureStatusLabel: "success",
    apartmentName: String(visionData.apartmentName || trace.siteName || "").trim(),
    building: String(visionData.building || trace.building || "").trim(),
    unit: String(visionData.unit || trace.unit || "").trim(),
    confidence: visionData.confidence ?? chatResult?.parseDiagnostics?.confidence ?? null,
  };
}

export function buildVisionOcrDiagFromTesseract(chatResult = null, { visionAttempted = false } = {}) {
  const trace = chatResult?.structureTrace || {};
  const metrics = chatResult?.structureMetrics || {};
  return {
    engine: "tesseract",
    engineLabel: "Tesseract Fallback",
    banner: "Tesseract Fallback 사용됨",
    model: null,
    structureStatus: "fallback",
    structureStatusLabel: "fallback",
    apartmentName: String(trace.siteName || metrics.siteName || "").trim(),
    building: String(trace.building || metrics.building || "").trim(),
    unit: String(trace.unit || metrics.unit || "").trim(),
    confidence: chatResult?.parseDiagnostics?.confidence ?? null,
    visionAttempted: Boolean(visionAttempted),
  };
}

export function buildVisionOcrDiagFromStructured(
  structured = {},
  { visionSource = false, visionAttempted = false } = {}
) {
  if (visionSource) {
    return buildVisionOcrDiagFromVision({
      apartmentName: structured.apartmentName,
      building: structured.building,
      unit: structured.unit,
      confidence: structured.confidence,
    });
  }
  return buildVisionOcrDiagFromTesseract(
    {
      structureTrace: {
        siteName: structured.apartmentName,
        building: structured.building,
        unit: structured.unit,
      },
      parseDiagnostics: { confidence: structured.confidence },
    },
    { visionAttempted }
  );
}
