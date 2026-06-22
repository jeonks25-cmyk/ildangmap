import { explainGarbageTitle, resolveFailureStage } from "./siteImportDiag";

describe("siteImportDiag", () => {
  test("-6 제목 원인 설명", () => {
    const reason = explainGarbageTitle("-6", 2, "-6");
    expect(reason).toContain("숫자만");
  });

  test("실패 단계 구분 — 구조화 실패", () => {
    const failure = resolveFailureStage({
      ocrText: "KT 12:52",
      fieldParse: { structureOk: false, building: "", unit: "" },
      title: null,
      titleDiag: { garbageRejected: true, rejectedTitle: "-6" },
    });
    expect(failure.stage).toBe("structure_failed");
  });

  test("실패 단계 구분 — 제목 쓰레기 폐기", () => {
    const failure = resolveFailureStage({
      ocrText: "some text",
      fieldParse: { structureOk: false, building: "", unit: "" },
      title: "",
      titleDiag: { garbageRejected: true },
    });
    expect(failure.stage).toBe("structure_failed");
  });
});
