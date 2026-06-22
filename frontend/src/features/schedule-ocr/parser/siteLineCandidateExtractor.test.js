import {
  extractSiteLineCandidates,
  isExcludedSiteLine,
} from "../parser/siteLineCandidateExtractor";

describe("siteLineCandidateExtractor", () => {
  const sample = `장재열
ㅋㅋ 수고했어요
수요일 쌍용동1303
더본 인테리어
우리 1002266934100
장재계룡계룡1109동1402호
공동비번:0507
010-1234-5678`;

  test("발신자·전화·잡담 줄 제외", () => {
    expect(isExcludedSiteLine("장재열", 0)).toBe(true);
    expect(isExcludedSiteLine("010-1234-5678", 7)).toBe(true);
    expect(isExcludedSiteLine("ㅋㅋ 수고했어요", 1)).toBe(true);
  });

  test("동·호·비번 키워드 줄 가중치", () => {
    expect(isExcludedSiteLine("수요일 쌍용동1303", 2)).toBe(false);
    expect(isExcludedSiteLine("공동비번:0507", 6)).toBe(false);

    const { candidates } = extractSiteLineCandidates(sample, { maxCandidates: 10 });
    const texts = candidates.map((c) => c.text);
    expect(texts).toContain("장재계룡계룡1109동1402호");
    expect(texts.some((t) => t.includes("쌍용동"))).toBe(true);
    expect(texts).not.toContain("장재열");
    expect(texts).not.toContain("010-1234-5678");

    const top = candidates[0];
    expect(top.score).toBeGreaterThanOrEqual(100);
    expect(top.text).toMatch(/동|호|비번/);
  });

  test("동호 붙은 줄이 인테리어·잡담보다 우선", () => {
    const { candidates, selectedId } = extractSiteLineCandidates(sample);
    const top = candidates.find((c) => c.id === selectedId) || candidates[0];
    expect(top.text).toBe("장재계룡계룡1109동1402호");
  });
});
