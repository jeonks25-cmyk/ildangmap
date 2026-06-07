/** @typedef {"technician" | "foreman" | "consumer"} ShellPersona */

/**
 * @param {{ userType?: string, shellPersona?: string }} profile
 * @returns {ShellPersona}
 */
export function getEffectiveShellPersona(profile) {
  const raw = profile?.shellPersona;
  if (raw === "foreman" || raw === "technician" || raw === "consumer") return raw;
  const ut = String(profile?.userType || "").toLowerCase();
  if (ut === "foreman") return "foreman";
  if (ut === "consumer") return "consumer";
  return "technician";
}

/**
 * @param {{ userType?: string, shellPersona?: string }} profile
 * @returns {string}
 */
export function getPublicRoleBadgeLabel(profile) {
  const p = getEffectiveShellPersona(profile);
  if (p === "foreman") return "오야지";
  if (p === "consumer") return "소비자";
  return "기술자";
}
