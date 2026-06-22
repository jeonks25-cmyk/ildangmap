import {
  buildVisionOcrDiagFromVision,
  formatVisionConfidence,
  GEMINI_VISION_MODEL,
} from "./visionOcrDiagModel";

describe("visionOcrDiagModel", () => {
  it("builds Gemini Vision diag", () => {
    const diag = buildVisionOcrDiagFromVision({
      apartmentName: "장재계룡",
      building: "1109",
      unit: "1402",
      confidence: 0.95,
    });
    expect(diag.banner).toBe("Gemini Vision 사용됨");
    expect(diag.engineLabel).toBe("Gemini Vision");
    expect(diag.model).toBe(GEMINI_VISION_MODEL);
    expect(diag.structureStatusLabel).toBe("success");
    expect(diag.apartmentName).toBe("장재계룡");
    expect(formatVisionConfidence(diag.confidence)).toBe("95%");
  });
});
