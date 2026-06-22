import {
  postprocessOcrText,
  restoreDongHoInText,
  correctSiteNameOcr,
  pickBestOcrResult,
  scoreOcrCandidate,
  sanitizeOcrGarbage,
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

  test("KT 상태바 노이즈 제거", () => {
    expect(sanitizeOcrGarbage("KT12:525M@0627all&장재계룡1109동1402호")).toContain("장재계룡");
    expect(sanitizeOcrGarbage("KT12:525M@0627all&장재계룡1109동1402호")).not.toMatch(/^KT/i);
  });

  test("OCR voting — UI 노이즈보다 정상 텍스트 선택", () => {
    const winner = pickBestOcrResult([
      { text: "KT12:525M@0627all&장재열QQhaCS", rawText: "KT12:525M@0627all&장재열QQhaCS", confidence: 90 },
      { text: "장재계룡 1109동 1402호\n공동비번 #1402", rawText: "장재계룡 1109동 1402호\n공동비번 #1402", confidence: 70 },
    ]);
    expect(winner.rawText).toContain("1109동");
  });

  test("scoreOcrCandidate 동호 가중치", () => {
    const withDongHo = scoreOcrCandidate("장재계룡 1109동 1402호");
    const without = scoreOcrCandidate("ZAZA");
    expect(withDongHo).toBeGreaterThan(without);
  });
});
