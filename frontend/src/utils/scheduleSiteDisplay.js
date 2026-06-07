/**
 * 일정 탭 셀·목록용 현장명 축약 + 공정 색상
 */

const CRAFT_TONE = {
  film: "film",
  wallpaper: "wallpaper",
  tile: "tile",
  electric: "electric",
  paint: "wallpaper",
};

const CRAFT_SHORT = {
  film: "필름",
  wallpaper: "도배",
  tile: "타일",
  electric: "전기",
};

const TITLE_CRAFT_HINTS = [
  { pattern: /필름|시공필름/, craft: "film", short: "필름" },
  { pattern: /도배/, craft: "wallpaper", short: "도배" },
  { pattern: /타일|조공/, craft: "tile", short: "타일" },
  { pattern: /전기/, craft: "electric", short: "전기" },
];

function resolveCraftFromTitle(title, craft) {
  const key = String(craft || "").trim().toLowerCase();
  if (CRAFT_TONE[key]) return key;
  const t = String(title || "");
  const hit = TITLE_CRAFT_HINTS.find((h) => h.pattern.test(t));
  return hit?.craft || "other";
}

/** 캘린더·목록에 쓸 짧은 현장명 (둔산필름, 용운타일 등) */
export function abbreviateSiteTitle(title, craft) {
  const raw = String(title || "").trim();
  if (!raw) return "현장";

  const craftKey = resolveCraftFromTitle(raw, craft);
  const craftShort = CRAFT_SHORT[craftKey] || "";

  const dongMatch = raw.match(/([가-힣]{2,5})동/);
  const dongShort = dongMatch ? dongMatch[1] : "";

  if (dongShort && craftShort) return `${dongShort}${craftShort}`;

  if (/^[가-힣]{2,6}$/.test(raw.replace(/\s/g, "")) && raw.length <= 8) {
    const compact = raw.split(/\s+/)[0];
    if (compact.length <= 6) return compact;
  }

  const first = raw.split(/\s+/)[0] || raw;
  if (first.length <= 6) return first;

  if (craftShort && first.length >= 2) {
    const head = first.replace(/동$/, "").slice(0, 4);
    return `${head}${craftShort}`;
  }

  return raw.length > 7 ? `${raw.slice(0, 6)}…` : raw;
}

export function getCraftTone(craft, title) {
  return CRAFT_TONE[resolveCraftFromTitle(title, craft)] || "other";
}

