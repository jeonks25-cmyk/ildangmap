import { CRAFT_LABEL, getJobCraft } from "./jobModel";

const PREPARATION_INFO_META = [
  { key: "parkingNote", icon: "📍", label: "주차" },
  { key: "accessPassword", icon: "🔑", label: "비밀번호" },
  { key: "requiredItems", icon: "🪜", label: "준비물" },
  { key: "mealNote", icon: "🥤", label: "식사" },
  { key: "specialNote", icon: "🚫", label: "특이사항" },
  { key: "materialNote", icon: "📦", label: "자재" },
];

const DEFAULT_REQUIRED_ITEMS = {
  film: "사다리 필요",
  wallpaper: "칼, 롤러 준비",
  tile: "무릎보호대 필요",
  electric: "절연장갑, 드라이버 준비",
  facility: "작업장갑, 줄자 준비",
  paint: "마스킹칼, 장갑 준비",
};

const DEFAULT_MATERIAL_NOTE = {
  film: "LX 베니프 화이트 사용",
  wallpaper: "실크 벽지 화이트 톤 사용",
  tile: "300각 포세린 타일 사용",
  electric: "배선 마감 자재 현장 지급",
  facility: "배관 자재 현장 준비",
  paint: "친환경 수성 페인트 사용",
};

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getDefaultSpecialNote(entity) {
  const siteKind = cleanText(entity?.siteKind);
  if (/(오피스텔|상가|학원|카페)/.test(siteKind)) return "엘리베이터 사용 제한";
  if (/(관공서|청사)/.test(siteKind)) return "출입증 확인 필요";
  return "현장 도착 전 연락";
}

function getDefaultMealNote(entity) {
  const value = cleanText(entity?.mealNote);
  if (value) return value;
  return entity?.mealProvided === false ? "식사 미제공" : "점심 제공";
}

function getDefaultRequiredItems(entity) {
  const craft = getJobCraft(entity);
  return DEFAULT_REQUIRED_ITEMS[craft] || "공구 챙김";
}

function getDefaultMaterialNote(entity) {
  const craft = getJobCraft(entity);
  return DEFAULT_MATERIAL_NOTE[craft] || "현장 지급 자재 사용";
}

function getPreparationValue(entity, key) {
  const direct = cleanText(entity?.[key]);
  if (direct) return direct;
  if (key === "parkingNote") return entity?.parkingAvailable === false ? "주차 문의" : "지하 2층 가능";
  if (key === "accessPassword") return cleanText(entity?.accessPassword) || "1234#";
  if (key === "requiredItems") return getDefaultRequiredItems(entity);
  if (key === "mealNote") return getDefaultMealNote(entity);
  if (key === "specialNote") return getDefaultSpecialNote(entity);
  if (key === "materialNote") return getDefaultMaterialNote(entity);
  return "";
}

function buildChecklistLabel(entity) {
  const requiredItems = getPreparationValue(entity, "requiredItems");
  const first = requiredItems
    .split(/[,\u00b7/]/)
    .map((item) => item.trim())
    .filter(Boolean)[0];
  if (first) {
    return `${first.replace(/(필요|준비|사용)$/g, "").trim()} 준비 완료`;
  }
  const craftLabel = CRAFT_LABEL[getJobCraft(entity)] || "현장";
  return `${craftLabel} 준비 완료`;
}

export function buildPreparationInfoItems(entity) {
  return PREPARATION_INFO_META.map((meta) => ({
    ...meta,
    value: getPreparationValue(entity, meta.key),
  })).filter((item) => item.value);
}

export function normalizePreparationChecklist(entity) {
  const existing = Array.isArray(entity?.prepChecklist) ? entity.prepChecklist : [];
  if (existing.length) {
    return existing.map((item, index) => ({
      id: item?.id || `prep-check-${index + 1}`,
      label: cleanText(item?.label) || `준비 항목 ${index + 1}`,
      checked: Boolean(item?.checked),
    }));
  }

  const craftLabel = CRAFT_LABEL[getJobCraft(entity)] || "현장";
  return [
    { id: "prep-main", label: buildChecklistLabel(entity), checked: false },
    { id: "prep-tools", label: `${craftLabel} 공구 챙김`, checked: false },
  ];
}

export function togglePreparationChecklist(checklist, targetId) {
  return (Array.isArray(checklist) ? checklist : []).map((item) =>
    item?.id === targetId ? { ...item, checked: !item.checked } : item
  );
}
