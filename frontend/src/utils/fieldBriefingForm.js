/** 현장 브리핑 폼 — 체크리스트형 고정 항목 */

export const BRIEFING_FORM_KEYS = ["assembleTime", "parking", "gear", "materials", "payment"];

export const BRIEFING_FORM_ROWS = [
  { key: "assembleTime", icon: "⏰", label: "집합시간" },
  { key: "parking", icon: "🚗", label: "주차" },
  { key: "gear", icon: "🧰", label: "준비물" },
  { key: "materials", icon: "📦", label: "자재" },
  { key: "payment", icon: "💵", label: "지급방식" },
];

const EMPTY_FORM = {
  assembleTime: "",
  parking: "",
  gear: "",
  materials: "",
  payment: "",
};

export function normalizeBriefingForm(raw) {
  const base = { ...EMPTY_FORM, ...(raw && typeof raw === "object" ? raw : {}) };
  BRIEFING_FORM_KEYS.forEach((k) => {
    base[k] = String(base[k] ?? "").trim();
  });
  return base;
}

/** briefingItems(문자열/객체 배열) → 폼 (최대 5줄 매핑) */
export function briefingFormFromLegacyItems(items) {
  const list = Array.isArray(items) ? items : [];
  const texts = list.map((it) => (typeof it === "string" ? it : String(it?.text ?? "").trim())).filter(Boolean);
  const form = { ...EMPTY_FORM };
  BRIEFING_FORM_KEYS.forEach((key, i) => {
    form[key] = texts[i] || "";
  });
  return normalizeBriefingForm(form);
}

/**
 * @param {object} field — startTime, meetLocation 등
 * @param {string[]} lines — mock briefing 줄
 */
export function buildDefaultBriefingForm(field, lines = []) {
  const texts = [...(Array.isArray(lines) ? lines : [])];
  const pad = (i) => texts[i] || "";

  const assemble =
    pad(0) ||
    (field?.startTime ? `${field.startTime} 전 집합` : "—");
  const parking = pad(1) || (field?.meetLocation ? String(field.meetLocation).slice(0, 40) : "지하 2층 가능");
  const gear = pad(2) || "커터칼 / 장갑";
  const materials = pad(3) || "오전 반입 예정";
  const payment = pad(4) || "현장 지급";

  return normalizeBriefingForm({
    assembleTime: assemble,
    parking,
    gear,
    materials,
    payment,
  });
}
