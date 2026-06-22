import {
  BUSINESS_INDUSTRY_KEYWORDS,
  findBusinessTitle,
  findBuildingUnitTitle,
  buildApartmentDongHoTitle,
  findAddressFallbackTitle,
  isAddressLikeTitle,
  resolveScheduleTitleByPriority,
} from "./scheduleTitleResolver";
import { isNoiseLine } from "./siteFieldParser";

const KARAOKE_KW = BUSINESS_INDUSTRY_KEYWORDS.find(
  (k) => k.includes("연습장") && !k.includes("코인")
);

describe("scheduleTitleResolver", () => {
  test("isAddressLikeTitle — 상호명은 주소 아님", () => {
    const shopName = "행복" + KARAOKE_KW;
    expect(isAddressLikeTitle(shopName)).toBe(false);
    expect(isAddressLikeTitle("충남천안시동남구청수")).toBe(true);
    expect(isNoiseLine(shopName)).toBe(false);
    expect(shopName.includes(KARAOKE_KW)).toBe(true);
  });

  test("상호명 우선 — PC방", () => {
    expect(findBusinessTitle(["강남 PC방"])).toBe("강남 PC방");
  });

  test("상호명 우선 — 노래연습장", () => {
    const shopName = "행복" + KARAOKE_KW;
    const lines = ["수요일", shopName, "공동비번 1234"];
    expect(findBusinessTitle(lines)).toBe(shopName);
  });

  test("건물명+호수 — 에이스법조타워 212호", () => {
    const lines = ["에이스법조타워 212호", "공동비번 1234"];
    expect(findBuildingUnitTitle(lines)).toBe("에이스법조타워 212호");
  });

  test("아파트+동호 — 장재계룡 1109동 1402호", () => {
    expect(
      buildApartmentDongHoTitle({
        apartmentName: "장재계룡",
        building: "1109",
        unit: "1402",
      })
    ).toBe("장재계룡 1109동 1402호");
  });

  test("주소 조각 제목 금지 — 충남천안시동남구청수", () => {
    expect(isAddressLikeTitle("충남천안시동남구청수")).toBe(true);
    expect(findAddressFallbackTitle(["충남천안시동남구청수"])).toBe("");
  });

  test("우선순위 — 상호명이 동호보다 먼저", () => {
    const shopName = "행복" + KARAOKE_KW;
    const titleDiag = { steps: [] };
    const result = resolveScheduleTitleByPriority({
      apartmentName: "장재계룡",
      building: "1109",
      unit: "1402",
      lines: [shopName, "장재계룡 1109동 1402호"],
      titleDiag,
    });
    expect(result.title).toBe(shopName);
    expect(result.titlePath).toBe("priority1_business_name");
  });

  test("우선순위 — 건물+호가 아파트 동호보다 먼저", () => {
    const titleDiag = { steps: [] };
    const result = resolveScheduleTitleByPriority({
      apartmentName: "장재계룡",
      building: "1109",
      unit: "1402",
      lines: ["에이스법조타워 212호", "장재계룡 1109동 1402호"],
      titleDiag,
    });
    expect(result.title).toBe("에이스법조타워 212호");
    expect(result.titlePath).toBe("priority2_building_unit");
  });

  test("우선순위 — 동호만 있으면 priority3", () => {
    const titleDiag = { steps: [] };
    const result = resolveScheduleTitleByPriority({
      building: "1109",
      unit: "1402",
      lines: ["1109동 1402호"],
      titleDiag,
    });
    expect(result.title).toBe("1109동 1402호");
    expect(result.titlePath).toBe("priority3_dong_ho_only");
  });
});
