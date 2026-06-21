import { CRAFT_LABEL } from "../utils/jobModel";
import {
  formatRegionsLabel,
  getPrimaryRegion,
  normalizeActivityRegions,
} from "../constants/activityRegions";

/**
 * 사용자 프로필 도메인 모델 — localStorage(MVP) · 추후 API 공통.
 */

export function normalizeProfileFields(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const experienceYears = Number.isFinite(Number(source.experienceYears))
    ? Number(source.experienceYears)
    : Number.isFinite(Number(source.careerYears))
      ? Number(source.careerYears)
      : null;
  const desiredPay = Number.isFinite(Number(source.desiredPay)) && Number(source.desiredPay) > 0 ? Number(source.desiredPay) : null;
  const birthYear =
    Number.isFinite(Number(source.birthYear)) && Number(source.birthYear) > 1900 ? Number(source.birthYear) : null;
  const regions = normalizeActivityRegions(source.regions ?? source.region ?? source.residence);
  const region = getPrimaryRegion(regions);

  return {
    nickname: String(source.nickname || source.displayNickname || "").trim(),
    birthYear,
    regions,
    region,
    craft: String(source.craft || "film").trim(),
    experienceYears: experienceYears != null && experienceYears >= 0 ? experienceYears : null,
    desiredPay,
    phone: String(source.phone || "").trim(),
    intro: String(source.intro || "").trim(),
  };
}

/** 폼 → store patch */
export function profilePatchFromForm(form = {}) {
  const exp = form.experienceYearsText ? Number(form.experienceYearsText) : null;
  const pay = form.desiredPayText ? Number(form.desiredPayText) : null;
  const regions = normalizeActivityRegions(form.regions);
  const region = getPrimaryRegion(regions);
  return {
    nickname: String(form.nickname || "").trim(),
    regions,
    region,
    residence: formatRegionsLabel(regions, { emptyLabel: "" }),
    craft: form.craft,
    experienceYears: Number.isFinite(exp) && exp >= 0 ? exp : null,
    careerYears: Number.isFinite(exp) && exp >= 0 ? exp : null,
    desiredPay: Number.isFinite(pay) && pay > 0 ? pay : null,
    phone: String(form.phone || "").trim(),
  };
}

/** store + meta → API body (추후 연동) */
export function profileToApiPayload(profile, profileMeta = {}) {
  const fields = normalizeProfileFields({ ...profile, intro: profileMeta?.intro });
  return {
    nickname: fields.nickname,
    birthYear: fields.birthYear,
    regions: fields.regions,
    region: fields.region,
    craft: fields.craft,
    experienceYears: fields.experienceYears,
    desiredPay: fields.desiredPay,
    phone: fields.phone,
    intro: fields.intro,
  };
}

function formatDesiredPayLine(pay) {
  const n = Number(pay);
  if (!Number.isFinite(n) || n <= 0) return "";
  return `희망일당 ${n}만원`;
}

function formatCraftExperienceLine(craftKey, years) {
  const craftLabel = CRAFT_LABEL[craftKey] || craftKey;
  if (!craftLabel) return "";
  if (years != null && years >= 0) return `${craftLabel} · 경력 ${years}년`;
  return craftLabel;
}

/** 인원탭·설정 공통 표시 라인 */
export function buildProfileDisplayLines(profile, profileMeta = {}) {
  const f = normalizeProfileFields({ ...profile, intro: profileMeta?.intro });
  const lines = [];
  const craftLine = formatCraftExperienceLine(f.craft, f.experienceYears);
  if (craftLine) lines.push(craftLine);
  const payLine = formatDesiredPayLine(f.desiredPay);
  if (payLine) lines.push(payLine);
  const regionLine = formatRegionsLabel(f.regions, { emptyLabel: "" });
  if (regionLine) lines.push(regionLine);
  if (f.phone) lines.push(f.phone);
  return lines;
}
