/**
 * 백엔드 연결 불가 시 중복 fetch·콘솔 스팸 방지 (개발 환경 중심)
 */

let backendUnreachable = false;
let lastWarnAt = 0;
let hasWarnedOffline = false;

const WARN_COOLDOWN_MS = 60_000;

export function isBackendUnreachable() {
  return backendUnreachable;
}

export function markBackendReachable() {
  backendUnreachable = false;
}

export function markBackendUnreachable() {
  backendUnreachable = true;
}

/**
 * @param {string} path
 * @param {Error | import('./errors').ApiError} [error]
 */
export function logApiNetworkFailureOnce(path, error) {
  if (process.env.NODE_ENV === "production") return;

  const now = Date.now();
  if (hasWarnedOffline && now - lastWarnAt < WARN_COOLDOWN_MS) return;

  hasWarnedOffline = true;
  lastWarnAt = now;

  const base = String(process.env.REACT_APP_API_BASE_URL || "").trim() || "(same-origin)";
  const detail = error?.message ? ` — ${error.message}` : "";
  console.warn(
    `[API] 백엔드에 연결할 수 없습니다 (${base}). Spring(예: 8080)이 꺼져 있으면 정상입니다. 동일 경고는 ${WARN_COOLDOWN_MS / 1000}초간 생략합니다.${detail}`,
    path ? { path } : undefined
  );
}

/** 실 API 모드에서 최근 오프라인이면 fetch 생략 (브라우저 ERR_CONNECTION_REFUSED 스팸 방지) */
export function shouldSkipLiveApiRequest(useMock) {
  return !useMock && backendUnreachable;
}
