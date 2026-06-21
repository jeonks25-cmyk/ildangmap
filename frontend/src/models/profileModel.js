import { CRAFT_LABEL } from "../utils/jobModel";

/**
 * 사용자 프로필 도메인 모델 — localStorage(MVP) · 추후 API 공통.
 * @typedef {Object} UserProfileFields
 * @property {string} nickname
 * @property {string} region
 * @property {string} craft
 * @property {string} role
 * @property {string} trade
 * @property {number|null} experienceYears
 * @property {number|null} desiredPay
 * @property {string} phone
 * @property {string} intro
 */

export function normalizeProfileFields(raw = {}) {
  const experienceYears = Number.isFinite(Number(raw.experienceYears))
    ? Number(raw.experienceYears)
    : Number.isFinite(Number(raw.careerYears))
      ? Number(raw.careerYears)
      : null;
  const desiredPay = Number.isFinite(Number(raw.desiredPay)) && Number(raw.desiredPay) > 0 ? Number(raw.desiredPay) : null;

  return {
    nickname: String(raw.nickname || raw.displayNickname || "").trim(),
    region: String(raw.region || raw.residence || "").trim(),
    craft: String(raw.craft || "film").trim(),
    role: String(raw.role || raw.trade || "기공").trim(),
    trade: String(raw.trade || raw.role || "기공").trim(),
    experienceYears: experienceYears != null && experienceYears >= 0 ? experienceYears : null,
    desiredPay,
    phone: String(raw.phone || "").trim(),
    intro: String(raw.intro || "").trim(),
  };
}

/** 폼 → store patch */
export function profilePatchFromForm(form = {}) {
  const exp = form.experienceYearsText ? Number(form.experienceYearsText) : null;
  const pay = form.desiredPayText ? Number(form.desiredPayText) : null;
  return {
    nickname: String(form.nickname || "").trim(),
    region: form.region,
    residence: form.region,
    craft: form.craft,
    role: form.role,
    trade: form.role,
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
    region: fields.region,
    craft: fields.craft,
    role: fields.role,
    experienceYears: fields.experienceYears,
    desiredPay: fields.desiredPay,
    phone: fields.phone,
    intro: fields.intro,
  };
}

/** 인원탭·설정 공통 표시 라인 */
export function buildProfileDisplayLines(profile, profileMeta = {}) {
  const f = normalizeProfileFields({ ...profile, intro: profileMeta?.intro });
  const craftLabel = CRAFT_LABEL[f.craft] || f.craft;
  const lines = [];
  if (f.region) lines.push(f.region);
  if (craftLabel || f.role) lines.push([craftLabel, f.role].filter(Boolean).join(" "));
  if (f.experienceYears != null) lines.push(`${f.experienceYears}년`);
  if (f.desiredPay != null) lines.push(`희망 ${f.desiredPay}만`);
  if (f.phone) lines.push(f.phone);
  return lines;
}
