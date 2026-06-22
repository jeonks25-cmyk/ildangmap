/** 공정 자동 추론 — 브랜드·키워드 → craft wire value */

const CRAFT_RULES = [
  {
    craft: "film",
    keywords: [
      "영림",
      "현대",
      "LX",
      "KCC",
      "3M",
      "썬팅",
      "PS100",
      "PS200",
      "필름",
      "인테리어필름",
      "시트",
      "랩핑",
      "솔라",
      "우레탄",
    ],
    weight: 1,
  },
  {
    craft: "wallpaper",
    keywords: [
      "실크벽지",
      "합지",
      "신한벽지",
      "개나리벽지",
      "도배",
      "벽지",
      "풀바르",
      "마감재",
    ],
    weight: 1,
  },
  {
    craft: "tile",
    keywords: ["포세린", "600각", "300각", "줄눈", "타일", "석재", "대리석", "유니온"],
    weight: 1,
  },
  {
    craft: "electric",
    keywords: ["전선", "분전반", "콘센트", "전기", "배선", "조명", "스위치", "누전"],
    weight: 1,
  },
  {
    craft: "paint",
    keywords: ["페인트", "도장", "탄성", "코팅"],
    weight: 0.8,
  },
  {
    craft: "facility",
    keywords: ["설비", "배관", "양변기", "수전", "샤워", "보일러"],
    weight: 0.8,
  },
];

/**
 * @param {string} text
 * @returns {{ craft: string|null, confidence: number, matched: string[] }}
 */
export function inferCraftFromText(text) {
  const blob = String(text || "");
  if (!blob.trim()) return { craft: null, confidence: 0, matched: [] };

  const scores = {};
  const matchedByCraft = {};

  for (const rule of CRAFT_RULES) {
    for (const kw of rule.keywords) {
      const re = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      if (re.test(blob)) {
        scores[rule.craft] = (scores[rule.craft] || 0) + rule.weight;
        matchedByCraft[rule.craft] = matchedByCraft[rule.craft] || [];
        matchedByCraft[rule.craft].push(kw);
      }
    }
  }

  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return { craft: null, confidence: 0, matched: [] };

  const [craft, score] = entries[0];
  const confidence = Math.min(0.95, 0.55 + score * 0.15);
  return { craft, confidence, matched: matchedByCraft[craft] || [] };
}
