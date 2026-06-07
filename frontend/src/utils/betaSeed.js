/** 베타 테스트 전용 시드 — REACT_APP_BETA_SEED=true 일 때만 활성 */
export function isBetaSeedMode() {
  return String(process.env.REACT_APP_BETA_SEED || "").trim() === "true";
}
