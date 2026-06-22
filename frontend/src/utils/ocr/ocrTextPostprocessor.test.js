import {
  postprocessOcrText,
  restoreDongHoInText,
  correctSiteNameOcr,
  pickBestOcrResult,
  scoreOcrCandidate,
} from "./ocrTextPostprocessor";

describe("ocrTextPostprocessor", () => {
  test("110981402 → 1109동 1402호 복원", () => {
    const { text, corrections } = restoreDongHoInText("ZAZA =E110981402=");
    expect(text).toContain("1109동");
    expect(text).toContain("1402호");
    expect(corrections.length).toBeGreaterThan(0);
  });

  test("공동비번 라벨 복원", () => {
    const { text } = postprocessOcrText("SSH|H: #1402 0507");
    expect(text).toContain("공동비번");
    expect(text).toContain("#1402");
  });

  test("현장명 fuzzy correction", () => {
    expect(correctSiteNameOcr("장재계룡계룡")).toBe("장재계룡");
    expect(correctSiteNameOcr("장제계룡")).toBe("장재계룡");
    expect(correctSiteNameOcr("장재계룡개룡")).toBe("장재계룡");
  });

  test("OCR voting — 더 긴·한글 많은 결과 선택", () => {
    const winner = pickBestOcrResult([
      { text: "ZAZA", confidence: 90 },
      { text: "장재계룡 1109동 1402호\n공동비번 #1402", confidence: 70 },
    ]);
    expect(winner.text).toContain("1109동");
  });

  test("scoreOcrCandidate 동호 가중치", () => {
    const withDongHo = scoreOcrCandidate("장재계룡 1109동 1402호");
    const without = scoreOcrCandidate("ZAZA");
    expect(withDongHo).toBeGreaterThan(without);
  });
});
