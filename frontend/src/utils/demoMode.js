/**
 * localhost에서만 MVP 데모 데이터를 “항상 보이게” 노출합니다.
 * (로그인·applicantUserId·승인·공유 초대 조건 무시 — 프로덕션 도메인에서는 항상 false)
 */
export function isDemoMode() {
  if (typeof window === "undefined") return false;
  const h = String(window.location.hostname || "").toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h.endsWith(".localhost");
}
