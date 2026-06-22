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
    expect(failure.stage).toBe("title_garbage_rejected");
  });

  test("실패 단계 구분 — 동·호 있으면 structure_partial 아님", () => {
    const failure = resolveFailureStage({
      ocrText: "1109동 1402호",
      fieldParse: {
        structureOk: true,
        building: "1109",
        unit: "1402",
        siteName: "",
        structureOkDiag: { formula: "Boolean(building && unit)" },
      },
      title: "1109동 1402호",
      titleDiag: {},
    });
    expect(failure.stage).toBe("ok");
  });
});
