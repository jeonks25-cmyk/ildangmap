import { parseSiteFields, buildSiteTitle } from "./siteFieldParser";
import { extractSiteInfo } from "../extractor/siteInfoExtractor";

describe("siteFieldParser", () => {
  test("장재계룡계룡1109동1402호 → 현장명·동·호 분리", () => {
    const result = parseSiteFields("장재계룡계룡1109동1402호", { debug: false });

    expect(result.siteName).toBe("장재계룡");
    expect(result.building).toBe("1109");
    expect(result.unit).toBe("1402");
    expect(result.final.title).toBe("장재계룡 1109동 1402호");
    expect(result.structureOk).toBe(true);
  });

  test("공백 포함 형식", () => {
    const result = parseSiteFields("장재계룡 1109동 1402호", { debug: false });
    expect(result.siteName).toBe("장재계룡");
    expect(result.building).toBe("1109");
    expect(result.unit).toBe("1402");
  });

  test("카톡 OCR 노이즈 줄이 있어도 현장 줄 추출", () => {
    const blob = `KT 12:52
장재계룡계룡1109동1402호
안방붙박이장
공동비번:#1402 0507`;
    const result = parseSiteFields(blob, { debug: false });

    expect(result.siteName).toBe("장재계룡");
    expect(result.building).toBe("1109");
    expect(result.unit).toBe("1402");
    expect(result.structureOk).toBe(true);
  });

  test("extractSiteInfo 통합 — 동호 포함 제목", () => {
    const info = extractSiteInfo("장재계룡계룡1109동1402호");

    expect(info.apartmentName).toBe("장재계룡");
    expect(info.building).toBe("1109");
    expect(info.unit).toBe("1402");
    expect(info.hasUnit).toBe(true);
    expect(buildSiteTitle({
      siteName: info.apartmentName,
      building: info.building,
      unit: info.unit,
    })).toBe("장재계룡 1109동 1402호");
  });

  test("현장명·동호가 줄 분리된 경우", () => {
    const result = parseSiteFields("장재계룡계룡\n1109동1402호", { debug: false });
    expect(result.siteName).toBe("장재계룡");
    expect(result.building).toBe("1109");
    expect(result.unit).toBe("1402");
    expect(result.structureOk).toBe(true);
  });

  test("호 없이 동·호수만 있는 경우", () => {
    const result = parseSiteFields("장재계룡계룡1109동1402", { debug: false });
    expect(result.siteName).toBe("장재계룡");
    expect(result.building).toBe("1109");
    expect(result.unit).toBe("1402");
  });

  test("OCR 동 오인식 (东)", () => {
    const result = parseSiteFields("장재계룡계룡1109东1402호", { debug: false });
    expect(result.siteName).toBe("장재계룡");
    expect(result.building).toBe("1109");
    expect(result.unit).toBe("1402");
  });

  test("garbage 제목 -6 방지 (schedule paste)", () => {
    const { parseSchedulePasteText } = require("../../../utils/schedulePasteParser");
    const result = parseSchedulePasteText(`KT 12:52
장재계룡계룡1109동1402호
안방붙박이장`);
    expect(result.title).toBe("장재계룡 1109동 1402호");
    expect(result.structureOk).toBe(true);
    expect(result.structureMetrics).toEqual({
      siteName: "장재계룡",
      building: "1109",
      unit: "1402",
    });
  });

  test("OCR 노이즈만 있고 현장 줄 없으면 -6 제목 방지", () => {
    const { parseSchedulePasteText } = require("../../../utils/schedulePasteParser");
    const result = parseSchedulePasteText(`KT 12:52 » Md&@p
ih
a`);
    expect(result.title).not.toBe("-6");
    expect(result.structureOk).toBe(false);
  });
});
