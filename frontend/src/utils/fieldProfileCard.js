/**
 * 현장 명함(실명 네트워크) 표준 모델 & 표시 포매터.
 *
 * 일당맵은 익명 커뮤니티가 아니라 현장 실명 네트워크다.
 * 프로필/연락처/팀원/참여자/게시판/채팅 등 앱 전역에서 같은 인물 표기를 쓰기 위해
 * 다양한 소스(프로필, 연락처 mock, 초대 invitee 등)를 하나의 인물 객체로 정규화한다.
 *
 * 이번 단계는 UI/데이터 구조만 — 레벨/평판/출석률 없음.
 */
import { CRAFT_LABEL } from "./jobModel";

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

/** 직종 + 경력 — "도배 3년" */
export function formatCraftCareerLine(person) {
  const craft = craftLabelOf(person?.craftLabel || person?.craft || person?.trade);
  const years = Number(person?.careerYears ?? person?.experienceYears);
  if (craft && Number.isFinite(years) && years > 0) return `${craft} ${years}년`;
  return craft || "";
}

/** basePay(만원 단위 또는 원) → "현재 일당 160,000원" */
export function formatPersonDailyPayLabel(basePay) {
  const n = Number(basePay);
  if (!Number.isFinite(n) || n <= 0) return "";
  const won = n < 1000 ? Math.round(n * 10000) : Math.round(n);
  return `현재 일당 ${won.toLocaleString("ko-KR")}원`;
}

function craftLabelOf(value) {
  if (!value) return "";
  return CRAFT_LABEL[value] || value;
}

/** 직종 라벨: "필름 기공" (공정 + 직군) */
export function formatCraftRoleLabel(person) {
  const craft = craftLabelOf(person?.craftLabel || person?.craft || person?.trade);
  const role = String(person?.role || "").trim();
  return [craft, role].filter(Boolean).join(" ");
}

/**
 * 프로필/연락처/초대 invitee 등 다양한 소스를 명함용 표준 인물로 정규화한다.
 * @returns {{id:any,name:string,birthYear:number|null,residence:string,craft:string,craftLabel:string,role:string,careerYears:number|null,basePay:number|null,photo:string,coworkCount:number|null,recentSites:Array}|null}
 */
export function toFieldPerson(source) {
  if (!source || typeof source !== "object") return null;
  const name = String(source.realName || source.name || "").trim() || "이름 미입력";
  const birthYear = Number.isFinite(Number(source.birthYear)) ? Number(source.birthYear) : null;
  const residence = String(source.residence || source.homeRegion || source.region || "").trim();
  const craft = source.craft || source.trade || "";
  const craftLabel = source.craftLabel || craftLabelOf(craft);
  const role = String(source.role || "").trim();
  const careerYears = Number.isFinite(Number(source.careerYears))
    ? Number(source.careerYears)
    : Number.isFinite(Number(source.experienceYears))
      ? Number(source.experienceYears)
      : null;
  const basePayRaw = Number(source.basePay);
  const basePay = Number.isFinite(basePayRaw) && basePayRaw > 0 ? basePayRaw : null;
  const photo = String(source.photo || source.profileImage || "").trim();
  const coworkCount = Number.isFinite(Number(source.coworkCount)) ? Number(source.coworkCount) : null;
  const recentSites = Array.isArray(source.recentSites) ? source.recentSites.filter(Boolean) : [];
  return { id: source.id, name, birthYear, residence, craft, craftLabel, role, careerYears, basePay, photo, coworkCount, recentSites };
}

/**
 * 사용처별 표시 라인 빌더.
 * - contact: 이름 / 84년생 / 천안 / 필름 기공
 * - invite, participant: 이름 / 84년생 / 천안
 * - author, chat: 이름 / 84년생
 * - card: 이름 / 84년생 / 천안 (+ 카드 본문에서 직종·경력 별도)
 */
export function buildPersonLines(source, context = "contact") {
  const p = toFieldPerson(source);
  if (!p) return { name: "", lines: [] };
  const birth = formatBirthYearLabel(p.birthYear);
  const craftRole = formatCraftRoleLabel(p);
  const byContext = {
    contact: [birth, p.residence, craftRole],
    invite: [birth, p.residence],
    participant: [birth, p.residence],
    author: [birth],
    chat: [birth],
    card: [birth, p.residence],
  };
  return { name: p.name, lines: (byContext[context] || byContext.contact).filter(Boolean) };
}

/** "김철수 · 84년생 · 천안 · 필름 기공" 형태 단일 문자열 */
export function formatPersonInline(source, context = "contact") {
  const { name, lines } = buildPersonLines(source, context);
  return [name, ...lines].filter(Boolean).join(" · ");
}
