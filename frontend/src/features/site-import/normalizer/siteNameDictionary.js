/**
 * 아파트·단지 브랜드 사전 + 지역별 알려진 단지 (천안·아산 중심)
 */

/** 신·구형 아파트 브랜드 */
export const APT_COMPLEX_BRANDS = [
  "자이",
  "푸르지오",
  "래미안",
  "더샵",
  "힐스테이트",
  "아이파크",
  "롯데캐슬",
  "리슈빌",
  "e편한세상",
  "이편한세상",
  "SK뷰",
  "호반",
  "우미",
  "계룡",
  "우방",
  "한양",
  "주공",
  "부영",
  "동아",
  "극동",
  "대림",
  "삼부",
  "신동아",
  "청솔",
  "현대",
  "대우",
  "롯데",
  "삼성",
];

/** OCR·줄임말 → 정규 브랜드 */
export const BRAND_ALIASES = {
  푸르지오우: "푸르지오",
  푸루지오: "푸르지오",
  푸르지오아파트: "푸르지오",
  힐스테이: "힐스테이트",
  힐스: "힐스테이트",
  힐스테이트아파트: "힐스테이트",
  계룡아파트: "계룡",
  계룡APT: "계룡",
  계룡리슈빌: "계룡",
  계룡ㅇ: "계룡",
  현대e: "현대",
  현대아파트: "현대",
  대우아파트: "대우",
  롯데아파트: "롯데",
  삼성아파트: "삼성",
  주공아파트: "주공",
  e편한: "e편한세상",
  이편한: "이편한세상",
  래미안아파트: "래미안",
  자이아파트: "자이",
};

/** 동·읍·리 토큰 (지역 추론용) */
export const NEIGHBORHOOD_TOKENS = [
  "장재",
  "쌍용",
  "불당",
  "성성",
  "배방",
  "신부",
  "두정",
  "성환",
  "봉명",
  "신창",
  "청수",
  "모란",
  "성정",
  "직산",
  "풍세",
  "탕정",
  "음봉",
  "인주",
  "둔포",
];

/**
 * @typedef {{ name: string, city: string, dong?: string, neighborhood?: string, aliases?: string[], brand?: string }} KnownComplex
 */
export const KNOWN_COMPLEXES = [
  {
    name: "장재계룡아파트",
    city: "천안",
    neighborhood: "장재",
    brand: "계룡",
    aliases: ["장재계룡", "계룡장재", "장재동계룡", "천안장재계룡"],
  },
  {
    name: "장재계룡리슈빌",
    city: "천안",
    neighborhood: "장재",
    brand: "계룡",
    aliases: ["장재계룡리슈빌", "장재리슈빌", "계룡리슈빌장재"],
  },
  {
    name: "장재푸르지오",
    city: "천안",
    neighborhood: "장재",
    brand: "푸르지오",
    aliases: ["장재푸르지오", "장재동푸르지오", "푸르지오장재"],
  },
  {
    name: "쌍용계룡아파트",
    city: "천안",
    neighborhood: "쌍용",
    brand: "계룡",
    aliases: ["쌍용계룡", "계룡쌍용"],
  },
  {
    name: "불당푸르지오",
    city: "천안",
    neighborhood: "불당",
    brand: "푸르지오",
    aliases: ["불당푸르지오", "푸르지오불당"],
  },
  {
    name: "배방힐스테이트",
    city: "아산",
    neighborhood: "배방",
    brand: "힐스테이트",
    aliases: ["배방힐스", "배방힐스테이트"],
  },
  {
    name: "탕정푸르지오",
    city: "아산",
    neighborhood: "탕정",
    brand: "푸르지오",
    aliases: ["탕정푸르지오", "아산탕정푸르지오"],
  },
  {
    name: "두정힐스테이트",
    city: "천안",
    neighborhood: "두정",
    brand: "힐스테이트",
    aliases: ["두정힐스", "두정힐스테이트"],
  },
  {
    name: "성성푸르지오",
    city: "천안",
    neighborhood: "성성",
    brand: "푸르지오",
    aliases: ["성성푸르지오"],
  },
  {
    name: "신부힐스테이트",
    city: "천안",
    neighborhood: "신부",
    brand: "힐스테이트",
    aliases: ["신부힐스"],
  },
];

export function expandBrandAliases(rawName) {
  const compact = String(rawName || "").replace(/\s+/g, "");
  if (!compact) return compact;

  for (const [alias, canonical] of Object.entries(BRAND_ALIASES)) {
    const aliasRe = new RegExp(alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (aliasRe.test(compact)) {
      return compact.replace(aliasRe, canonical);
    }
  }

  for (const brand of APT_COMPLEX_BRANDS) {
    const brandRe = new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (brandRe.test(compact)) {
      const idx = compact.search(brandRe);
      const before = compact.slice(0, idx);
      const brandPart = compact.slice(idx, idx + brand.length);
      const after = compact.slice(idx + brand.length);
      return [before, brandPart, after].filter(Boolean).join("");
    }
  }

  return compact;
}

export function extractNeighborhoodToken(text) {
  const compact = String(text || "").replace(/\s+/g, "");
  for (const token of NEIGHBORHOOD_TOKENS) {
    if (compact.includes(token)) return token;
  }
  return "";
}
