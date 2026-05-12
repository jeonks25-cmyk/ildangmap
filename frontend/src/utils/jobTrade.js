/** 직군·현장 유형 — jobModel·말풍선 등에서 공통 사용 */

export const TRADE_KEYS = ["조공", "준기공", "기공", "오야지"];

export const TRADE_META = {
  조공: { emoji: "🧰", accent: "jogong" },
  준기공: { emoji: "🏠", accent: "junki" },
  기공: { emoji: "🏢", accent: "gigi" },
  오야지: { emoji: "👔", accent: "oyaji" },
};

export const TRADE_SHORT = {
  조공: "조",
  준기공: "준",
  기공: "기",
  오야지: "오",
};

export const MAP_TRADE_CLASS = {
  조공: "maptrade-jogong",
  준기공: "maptrade-junki",
  기공: "maptrade-gigi",
  오야지: "maptrade-oyaji",
};

const SITE_META = {
  shop: { emoji: "🏢", accent: "shop" },
  apartment: { emoji: "🏠", accent: "apartment" },
  public: { emoji: "🏛", accent: "public" },
  school: { emoji: "🏫", accent: "school" },
  factory: { emoji: "🏭", accent: "factory" },
};

export function normalizeJobTrade(job) {
  const raw = job?.trade ?? job?.jobTrade ?? job?.직종;
  if (raw && TRADE_META[raw]) return raw;
  const t = String(job?.title ?? "");
  if (t.includes("오야지") || t.includes("사장")) return "오야지";
  if (t.includes("기공") && !t.includes("준")) return "기공";
  if (t.includes("준기공")) return "준기공";
  if (t.includes("조공")) return "조공";
  return "조공";
}

export function getTradeAccentKey(job) {
  const trade = normalizeJobTrade(job);
  return (TRADE_META[trade] || TRADE_META.조공).accent;
}

export function resolveSiteType(job) {
  const text = `${job?.title || ""} ${job?.address || ""} ${job?.shortAddress || ""}`;
  if (/(상가|매장|오피스|빌딩|센터)/.test(text)) return SITE_META.shop;
  if (/(아파트|주거|단지)/.test(text)) return SITE_META.apartment;
  if (/(관공서|시청|구청|청사|행정|연구원)/.test(text)) return SITE_META.public;
  if (/(학교|대학교|중학교|고등학교|캠퍼스)/.test(text)) return SITE_META.school;
  if (/(공장|산단|제조|물류|창고)/.test(text)) return SITE_META.factory;
  return SITE_META.shop;
}
