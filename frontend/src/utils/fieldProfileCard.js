/**
 * 현장 명함(실명 네트워크) 표준 모델 & 표시 포매터.
 */
import { CRAFT_LABEL } from "./jobModel";
import { formatRegionsLabel, normalizeActivityRegions } from "../constants/activityRegions";
import { normalizeBusinessCardFields } from "../models/profileModel";

/** 1984 → "84년생" */
export function formatBirthYearLabel(birthYear) {
  const n = Number(birthYear);
  if (!Number.isFinite(n) || n < 1900) return "";
  return `${String(n).slice(-2)}년생`;
}

/** 12 → "경력 12년" */
export function formatCareerLabel(years) {
  const n = Number(years);
  if (!Number.isFinite(n) || n <= 0) return "";
  return `경력 ${n}년`;
}

/** 직종 + 경력 — "필름 · 경력 3년" */
export function formatCraftCareerLine(person) {
  const craft = craftLabelOf(person?.craftLabel || person?.craft || person?.trade);
  const years = Number(person?.careerYears ?? person?.experienceYears);
  if (craft && Number.isFinite(years) && years >= 0) return `${craft} · 경력 ${years}년`;
  return craft || "";
}

/** basePay(만원) → "희망일당 20만원" */
export function formatPersonDailyPayLabel(basePay) {
  const n = Number(basePay);
  if (!Number.isFinite(n) || n <= 0) return "";
  return `희망일당 ${n}만원`;
}

function craftLabelOf(value) {
  if (!value) return "";
  return CRAFT_LABEL[value] || value;
}

/** @deprecated 공종만 표시 — role 미사용 */
export function formatCraftRoleLabel(person) {
  return craftLabelOf(person?.craftLabel || person?.craft || person?.trade);
}

function resolveResidence(source) {
  if (Array.isArray(source?.homeRegions) && source.homeRegions.length) {
    return formatRegionsLabel(source.homeRegions, { emptyLabel: "" });
  }
  if (Array.isArray(source?.regions) && source.regions.length) {
    return formatRegionsLabel(source.regions, { emptyLabel: "" });
  }
  const legacy = String(source?.residence || source?.homeRegion || source?.region || "").trim();
  return formatRegionsLabel(legacy, { emptyLabel: legacy });
}

/**
 * 프로필/연락처/초대 invitee 등 다양한 소스를 명함용 표준 인물로 정규화한다.
 */
export function toFieldPerson(source) {
  if (!source || typeof source !== "object") return null;
  const name = String(source.realName || source.name || "").trim() || "이름 미입력";
  const birthYear = Number.isFinite(Number(source.birthYear)) ? Number(source.birthYear) : null;
  const homeRegions = normalizeActivityRegions(source.homeRegions ?? source.regions ?? source.homeRegion ?? source.region);
  const residence = resolveResidence({ ...source, homeRegions });
  const craft = source.craft || source.trade || "";
  const craftLabel = source.craftLabel || craftLabelOf(craft);
  const careerYears = Number.isFinite(Number(source.careerYears))
    ? Number(source.careerYears)
    : Number.isFinite(Number(source.experienceYears))
      ? Number(source.experienceYears)
      : null;
  const basePayRaw = Number(source.basePay ?? source.desiredPay);
  const basePay = Number.isFinite(basePayRaw) && basePayRaw > 0 ? basePayRaw : null;
  const photo = String(source.photo || source.profileImage || source.portfolioImageUrl || "").trim();
  const coworkCount = Number.isFinite(Number(source.coworkCount)) ? Number(source.coworkCount) : null;
  const recentSites = Array.isArray(source.recentSites) ? source.recentSites.filter(Boolean) : [];
  const card = normalizeBusinessCardFields(source);
  return {
    id: source.id,
    name,
    birthYear,
    homeRegions,
    residence,
    craft,
    craftLabel,
    careerYears,
    basePay,
    photo,
    coworkCount,
    recentSites,
    ...card,
  };
}

/**
 * 사용처별 표시 라인 빌더.
 */
export function buildPersonLines(source, context = "contact") {
  const p = toFieldPerson(source);
  if (!p) return { name: "", lines: [] };
  const birth = formatBirthYearLabel(p.birthYear);
  const craftOnly = formatCraftRoleLabel(p);
  const byContext = {
    contact: [birth, p.residence, craftOnly],
    invite: [birth, p.residence],
    participant: [birth, p.residence],
    author: [birth],
    chat: [birth],
    card: [birth, p.residence],
  };
  return { name: p.name, lines: (byContext[context] || byContext.contact).filter(Boolean) };
}

/** "김철수 · 84년생 · 천안 · 필름" 형태 단일 문자열 */
export function formatPersonInline(source, context = "contact") {
  const { name, lines } = buildPersonLines(source, context);
  return [name, ...lines].filter(Boolean).join(" · ");
}
