import { MAP_ITEM_TYPE, MAP_ITEM_TYPE_LABEL } from "../constants/mapItemTypes";
import { applyOcrExtractionToDraft, createInitialJobPostDraft } from "./jobPostDraft";

export const MAP_ITEM_VISIBILITY = {
  PUBLIC: "public",
  LIMITED: "limited",
  TEAM_ONLY: "team_only",
  OWNER_ONLY: "owner_only",
};

export const MAP_ITEM_CONTACT_POLICY = {
  NONE: "none",
  APPROVED_ONLY: "approved_only",
  TEAM_ONLY: "team_only",
  OWNER_ONLY: "owner_only",
};

export const SCHEDULE_REGISTRATION_ITEMS = [
  {
    key: "field",
    type: MAP_ITEM_TYPE.FIELD,
    label: "현장",
    desc: "작업 날짜가 있는 실제 현장",
    action: "field",
  },
  {
    key: "helper_request",
    type: MAP_ITEM_TYPE.HELPER_REQUEST,
    label: "긴급 도움",
    desc: "2시간 도움, 당일 보조 요청",
    action: "field_help",
  },
  {
    key: "estimate_request",
    type: MAP_ITEM_TYPE.ESTIMATE_REQUEST,
    label: "시공 요청",
    desc: "소비자·입주민의 시공 문의",
    action: "quick_item",
  },
  {
    key: "sos",
    type: MAP_ITEM_TYPE.SOS,
    label: "긴급 SOS",
    desc: "현장 사고, 갑작스런 도움 요청",
    action: "quick_item",
  },
  {
    key: "food",
    type: MAP_ITEM_TYPE.RESTAURANT,
    label: "식당",
    desc: "점심, 기사식당, 빠른 식사 메모",
    action: "quick_item",
  },
  {
    key: "restroom",
    type: MAP_ITEM_TYPE.RESTROOM,
    label: "화장실",
    desc: "사용 가능 위치와 상태",
    action: "quick_item",
  },
  {
    key: "parking",
    type: MAP_ITEM_TYPE.PARKING,
    label: "주차",
    desc: "무료 주차, 대형차 가능 위치",
    action: "quick_item",
  },
  {
    key: "access_info",
    type: MAP_ITEM_TYPE.ACCESS_INFO,
    label: "출입 정보",
    desc: "출입구, 경비실, 엘리베이터 동선",
    action: "quick_item",
  },
  {
    key: "elevator",
    type: MAP_ITEM_TYPE.ELEVATOR,
    label: "엘리베이터",
    desc: "자재 이동, 사용 가능 시간",
    action: "quick_item",
  },
  {
    key: "material_pickup",
    type: MAP_ITEM_TYPE.MATERIAL_PICKUP,
    label: "자재 픽업",
    desc: "상차 위치, 픽업 시간, 담당자",
    action: "quick_item",
  },
  {
    key: "site_memo",
    type: MAP_ITEM_TYPE.SITE_MEMO,
    label: "현장 메모",
    desc: "짧은 주의사항과 작업 메모",
    action: "quick_item",
  },
];

const LIMITED_VISIBILITY_TYPES = new Set([
  MAP_ITEM_TYPE.ACCESS_INFO,
  MAP_ITEM_TYPE.ELEVATOR,
  MAP_ITEM_TYPE.SITE_MEMO,
  MAP_ITEM_TYPE.DANGER,
]);

const APPROVED_CONTACT_TYPES = new Set([
  MAP_ITEM_TYPE.FIELD,
  MAP_ITEM_TYPE.ESTIMATE,
  MAP_ITEM_TYPE.ESTIMATE_REQUEST,
  MAP_ITEM_TYPE.HELPER_REQUEST,
  MAP_ITEM_TYPE.SOS,
]);

export function getDefaultMapItemVisibility(type) {
  if (LIMITED_VISIBILITY_TYPES.has(type)) return MAP_ITEM_VISIBILITY.LIMITED;
  return MAP_ITEM_VISIBILITY.PUBLIC;
}

export function getDefaultMapItemContactPolicy(type) {
  if (APPROVED_CONTACT_TYPES.has(type)) return MAP_ITEM_CONTACT_POLICY.APPROVED_ONLY;
  if (type === MAP_ITEM_TYPE.ACCESS_INFO) return MAP_ITEM_CONTACT_POLICY.TEAM_ONLY;
  return MAP_ITEM_CONTACT_POLICY.NONE;
}

export function normalizeMapItemDraft(input = {}) {
  const now = input.createdAt || new Date().toISOString();
  const type = input.type || MAP_ITEM_TYPE.SITE_MEMO;
  const title = String(input.title || MAP_ITEM_TYPE_LABEL[type] || "현장 정보").trim();
  const lat = Number(input.lat);
  const lng = Number(input.lng);
  return {
    id: input.id || `${type}:draft:${Date.now()}`,
    type,
    layer: input.layer || type,
    title,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    address: String(input.address || "").trim(),
    roadAddress: String(input.roadAddress || "").trim(),
    jibunAddress: String(input.jibunAddress || "").trim(),
    scheduleDate: String(input.scheduleDate || input.workDate || "").trim(),
    createdBy: input.createdBy || "일당맵 사용자",
    visibility: input.visibility || getDefaultMapItemVisibility(type),
    contactPolicy: input.contactPolicy || getDefaultMapItemContactPolicy(type),
    meta: {
      ...(typeof input.meta === "object" && input.meta ? input.meta : {}),
      description: String(input.description || input.meta?.description || "").trim(),
      locationHint: String(input.locationHint || input.meta?.locationHint || "").trim(),
      placeUrl: String(input.placeUrl || input.meta?.placeUrl || "").trim(),
      kakaoMapLink: String(input.kakaoMapLink || input.meta?.kakaoMapLink || "").trim(),
      naverMapLink: String(input.naverMapLink || input.meta?.naverMapLink || "").trim(),
      nearestPlaceId: String(input.nearestPlaceId || input.meta?.nearestPlaceId || "").trim(),
    },
    participants: Array.isArray(input.participants) ? input.participants : [],
    reactions: input.reactions || {},
    comments: Array.isArray(input.comments) ? input.comments.filter(Boolean) : [],
    sourceMeta: {
      createdBy: input.createdBy || "일당맵 사용자",
      updatedAt: now,
      trustScore: Number(input.trustScore || 0),
      reportCount: Number(input.reportCount || 0),
      verificationStatus: input.verificationStatus || "editable",
    },
    source: input.source || { kind: "manual" },
  };
}

function extractDateRange(text, fallbackDateKey) {
  const blob = String(text || "");
  const year = fallbackDateKey?.slice(0, 4) || String(new Date().getFullYear());
  const mdRange = blob.match(/(\d{1,2})\s*[.\-/월]\s*(\d{1,2})\s*[~-]\s*(\d{1,2})\s*[.\-/월]?\s*(\d{1,2})/);
  if (mdRange) {
    const start = `${year}-${String(mdRange[1]).padStart(2, "0")}-${String(mdRange[2]).padStart(2, "0")}`;
    const end = `${year}-${String(mdRange[3]).padStart(2, "0")}-${String(mdRange[4]).padStart(2, "0")}`;
    return { start, end };
  }
  const single = extractDateKey(blob, fallbackDateKey);
  return single ? { start: single, end: single } : { start: fallbackDateKey || "", end: fallbackDateKey || "" };
}

function extractDateKey(text, fallbackDateKey) {
  const direct = String(text || "").match(/(20\d{2})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})/);
  if (direct) {
    const [, y, m, d] = direct;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  const md = String(text || "").match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (md) {
    const year = fallbackDateKey?.slice(0, 4) || String(new Date().getFullYear());
    return `${year}-${String(md[1]).padStart(2, "0")}-${String(md[2]).padStart(2, "0")}`;
  }
  return fallbackDateKey || "";
}

function normalizeKakaoChatText(rawText) {
  const lines = String(rawText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      if (/^\d{1,2}:\d{2}$/.test(line)) return false;
      if (/^(오전|오후)\s*\d{1,2}:\d{2}$/.test(line)) return false;
      if (/^\d+$/.test(line) && line.length <= 2) return false;
      if (/^(채팅방|메시지|입력|전송|검색)$/.test(line)) return false;
      return true;
    });
  return lines.join("\n");
}

function extractWorkTime(text) {
  const range = String(text || "").match(/(\d{1,2}:\d{2})\s*[~-]\s*(\d{1,2}:\d{2})/);
  if (range) return `${range[1]}~${range[2]}`;
  const hourRange = String(text || "").match(/(\d{1,2})\s*시\s*[~-]\s*(\d{1,2})\s*시/);
  if (hourRange) return `${String(hourRange[1]).padStart(2, "0")}:00~${String(hourRange[2]).padStart(2, "0")}:00`;
  return null;
}

function extractPayAmount(text) {
  const source = String(text || "");
  const man = source.match(/(\d{1,3})\s*만/);
  if (man) return Number(man[1]) * 10000;
  const won = source.match(/(\d[\d,]{4,})\s*원/);
  if (won) return Number(won[1].replace(/,/g, ""));
  return null;
}

function extractPhone(text) {
  const match = String(text || "").match(/01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/);
  if (!match) return null;
  return match[0].replace(/[^\d]/g, "").replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3");
}

function extractCraft(text) {
  const blob = String(text || "");
  const matchers = [
    ["wallpaper", /도배|벽지/],
    ["film", /필름|인테리어필름|시트/],
    ["tile", /타일|줄눈/],
    ["paint", /페인트|도장|탄성/],
    ["electric", /전기|조명|콘센트|배선/],
    ["facility", /설비|배관|수전|양변기|샷시/],
  ];
  const found = matchers.find(([, regex]) => regex.test(blob));
  return found ? found[0] : null;
}

function extractTrade(text) {
  const blob = String(text || "");
  if (/준기공/.test(blob)) return "준기공";
  if (/기공|기사/.test(blob)) return "기공";
  if (/조공|보조|헬프/.test(blob)) return "조공";
  return null;
}

function extractCrewCount(text) {
  const match = String(text || "").match(/(?:인원|팀원|기공|조공|보조|기사)?\s*(\d{1,2})\s*명/);
  if (!match) return null;
  const count = Number(match[1]);
  return Number.isFinite(count) && count > 0 ? count : null;
}

function extractAccessPassword(text) {
  const match = String(text || "").match(/(?:비밀번호|비번|출입번호|공동현관|비번은?)\s*[:：]?\s*([#*\d]{3,12})/);
  return match ? match[1] : null;
}

function pickLineByKeyword(lines, keywords) {
  return lines.find((line) => keywords.some((keyword) => line.includes(keyword))) || "";
}

function pickAddressLine(lines) {
  return (
    lines.find((line) => /(동|로|길|아파트|오피스텔|빌라|상가|빌딩|현장|주소)/.test(line) && line.length >= 4) ||
    lines.find((line) => line.length >= 6) ||
    ""
  );
}

function extractSiteStructure(text) {
  const blob = String(text || "");
  const apartment = blob.match(/([가-힣A-Za-z0-9\s]+?(?:아파트|오피스텔|빌라|상가))/)?.[1]?.trim() || "";
  const dong = blob.match(/(\d{1,3}\s*동)/)?.[1]?.replace(/\s+/g, "") || "";
  const ho = blob.match(/(\d{2,4}\s*호)/)?.[1]?.replace(/\s+/g, "") || "";
  const floor = blob.match(/(\d{1,2}\s*층)/)?.[1]?.replace(/\s+/g, "") || "";
  const password = extractAccessPassword(blob) || "";
  const type = /아파트/.test(blob)
    ? "아파트"
    : /오피스텔/.test(blob)
      ? "오피스텔"
      : /빌라/.test(blob)
        ? "빌라"
        : /상가/.test(blob)
          ? "상가"
          : "현장";
  return { apartment, dong, ho, floor, password, type };
}

function buildNormalizedAddress(lines, site) {
  const rawAddress = pickAddressLine(lines);
  const chunks = [rawAddress, site.apartment, site.dong, site.ho]
    .map((part) => String(part || "").trim())
    .filter(Boolean);
  const merged = chunks.join(" ").replace(/\s+/g, " ").trim();
  return merged || rawAddress || site.apartment || "";
}

export function parsePastedFieldText(text, selectedDateKey) {
  const normalized = normalizeKakaoChatText(text);
  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const site = extractSiteStructure(normalized);
  const normalizedAddress = buildNormalizedAddress(lines, site);
  const dateRange = extractDateRange(normalized, selectedDateKey);
  const workDate = dateRange.start;
  const workDateEnd = dateRange.end;
  const workTime = extractWorkTime(normalized);
  const payAmount = extractPayAmount(normalized);
  const contactPhone = extractPhone(normalized);
  const craft = extractCraft(normalized);
  const trade = extractTrade(normalized);
  const crewCount = extractCrewCount(normalized);
  const accessPassword = extractAccessPassword(normalized);
  const requiredItems = pickLineByKeyword(lines, ["준비물", "챙겨", "공구"]);
  const parkingNote = pickLineByKeyword(lines, ["주차", "주차장"]);
  const mealNote = pickLineByKeyword(lines, ["식사", "점심", "식대", "도시락"]);
  const materialNote = pickLineByKeyword(lines, ["자재", "상차", "픽업"]);
  const specialNote = pickLineByKeyword(lines, ["주의", "특이", "메모"]);
  const description = lines.slice(0, 5).join(" · ");
  return {
    address: normalizedAddress
      ? {
          shortRegion: normalizedAddress.split(/\s+/).slice(0, 2).join(" "),
          fullAddress: normalizedAddress,
          siteKind: site.type,
          confidence: 0.54,
        }
      : null,
    workDate: workDate ? { value: workDate, confidence: 0.72 } : null,
    workDateEnd: workDateEnd && workDateEnd !== workDate ? { value: workDateEnd, confidence: 0.7 } : workDateEnd ? { value: workDateEnd, confidence: 0.72 } : null,
    workTime: workTime ? { value: workTime, confidence: 0.68 } : null,
    payAmount: payAmount ? { value: payAmount, confidence: 0.62 } : null,
    craft: craft ? { value: craft, confidence: 0.66 } : null,
    trade: trade ? { value: trade, confidence: 0.62 } : null,
    crewCount: crewCount ? { value: crewCount, confidence: 0.64 } : null,
    contactPhone: contactPhone ? { value: contactPhone, confidence: 0.7 } : null,
    accessPassword: accessPassword || site.password ? { value: accessPassword || site.password, confidence: 0.74 } : null,
    requiredItems: requiredItems ? { value: requiredItems, confidence: 0.58 } : null,
    parkingNote: parkingNote ? { value: parkingNote, confidence: 0.58 } : null,
    mealNote: mealNote ? { value: mealNote, confidence: 0.56 } : null,
    materialNote: materialNote ? { value: materialNote, confidence: 0.58 } : null,
    specialNote: specialNote ? { value: specialNote, confidence: 0.52 } : null,
    description: description ? { value: description, confidence: 0.45 } : null,
    apartment: site.apartment ? { value: site.apartment, confidence: 0.62 } : null,
    dong: site.dong ? { value: site.dong, confidence: 0.62 } : null,
    ho: site.ho ? { value: site.ho, confidence: 0.62 } : null,
  };
}

export function createJobDraftFromPastedText({ text, mode = "post", selectedDateKey = "" } = {}) {
  const draft = createInitialJobPostDraft({ mode, selectedDateKey });
  const extracted = parsePastedFieldText(text, selectedDateKey);
  return applyOcrExtractionToDraft(draft, extracted, {
    ocrStatus: "ready",
    attachmentName: "붙여넣기 텍스트",
  });
}
