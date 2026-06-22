import { visionResponseToScheduleImport, visionResponseToStructured } from "./visionImportMapper";

describe("visionImportMapper", () => {
  const sample = {
    title: "장재계룡 1109동 1402호",
    apartmentName: "장재계룡",
    building: "1109",
    unit: "1402",
    commonPassword: "0507",
    housePassword: "0814",
    workItems: ["안방붙박이장", "영림 PS100"],
    confidence: 0.95,
  };

  it("maps vision JSON to schedule import result", () => {
    const result = visionResponseToScheduleImport(sample, { referenceDate: new Date("2026-06-21") });
    expect(result.structureOk).toBe(true);
    expect(result.title).toBe("장재계룡 1109동 1402호");
    expect(result.structureTrace.building).toBe("1109");
    expect(result.structureTrace.unit).toBe("1402");
    expect(result.memo).toContain("공동비밀번호: 0507");
    expect(result.parseDiagnostics.source).toBe("gemini-vision");
  });

  it("maps vision JSON to structured site import payload", () => {
    const structured = visionResponseToStructured(sample);
    expect(structured.ok).toBe(true);
    expect(structured.hasUnit).toBe(true);
    expect(structured.workItems).toEqual(["안방붙박이장", "영림 PS100"]);
    expect(structured.source).toBe("gemini-vision");
  });
});
