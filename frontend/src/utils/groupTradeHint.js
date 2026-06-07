import { CRAFT_KEYS, CRAFT_LABEL } from "./jobModel";

/** 그룹 tradeHint 선택지 — CRAFT_KEYS 기준, 강제 아님 */
export const GROUP_TRADE_HINT_OPTIONS = CRAFT_KEYS.map((key) => ({
  value: key,
  label: CRAFT_LABEL[key] || key,
}));

const NAME_CRAFT_PATTERNS = [
  { re: /필름/, craft: "film" },
  { re: /도배|벽지/, craft: "wallpaper" },
  { re: /타일/, craft: "tile" },
  { re: /페인트|도장/, craft: "paint" },
  { re: /전기|배선/, craft: "electric" },
  { re: /설비|배관/, craft: "facility" },
];

function isValidCraftKey(key) {
  return key && CRAFT_KEYS.includes(key);
}

/** 그룹 이름에서 공정 키 추론(힌트 없을 때만 보조). 매칭 없으면 null */
export function inferCraftFromGroupName(name) {
  const text = String(name || "");
  if (!text) return null;
  const hit = NAME_CRAFT_PATTERNS.find(({ re }) => re.test(text));
  return hit?.craft && isValidCraftKey(hit.craft) ? hit.craft : null;
}

/**
 * 현장 등록용 공정 추천: 저장된 tradeHint 우선, 없으면 그룹명 추론.
 * @returns {string|null} craft key
 */
export function resolveGroupCraft(group) {
  if (!group) return null;
  if (isValidCraftKey(group.tradeHint)) return group.tradeHint;
  return inferCraftFromGroupName(group.name);
}

/** UI 보조 라벨 — 예: "필름팀". 힌트·추론 모두 없으면 null */
export function formatGroupTradeLabel(group) {
  const craft = resolveGroupCraft(group);
  if (!craft) return null;
  const label = CRAFT_LABEL[craft] || craft;
  return `${label}팀`;
}

/** tradeHint가 이름 추론인지(저장 힌트 vs 추론) — UI 톤 구분용 */
export function isGroupTradeInferred(group) {
  if (!group) return false;
  if (isValidCraftKey(group.tradeHint)) return false;
  return Boolean(inferCraftFromGroupName(group.name));
}
