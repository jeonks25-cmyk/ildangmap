import { createApiError, getApiBaseUrl } from "./client";

function getBrowserOrigin() {
  if (typeof window === "undefined") return "";
  return String(window.location.origin || "").replace(/\/$/, "");
}

/**
 * 카카오 로그인 시작 URL — Spring OAuth2 단일 경로.
 * Vercel same-origin 프록시 또는 REACT_APP_API_BASE_URL/oauth2/authorization/kakao
 */
export function getKakaoOAuthStartUrl() {
  const base = getApiBaseUrl();
  if (!base && typeof window === "undefined") {
    return null;
  }
  return `${base}/oauth2/authorization/kakao`;
}

export function getSpringOAuthApiBase() {
  return getApiBaseUrl();
}

export async function probeSpringOAuthBackend(timeoutMs = 2800) {
  if (String(process.env.REACT_APP_SKIP_OAUTH_PROBE || "").trim() === "true") {
    return true;
  }
  const base = getSpringOAuthApiBase();
  if (!base) return false;
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/actuator/health`, {
      method: "GET",
      signal: ctrl.signal,
      mode: "cors",
      credentials: "omit",
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function logoutSession() {
  const base = getSpringOAuthApiBase();
  if (!base && typeof window === "undefined") return;
  try {
    await fetch(`${base}/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    /* noop */
  }
}

/** OAuth 직후 일회용 bt 토큰으로 same-origin 세션 쿠키 발급 */
export async function bootstrapSessionFromToken(bootstrapToken) {
  const token = String(bootstrapToken || "").trim();
  if (!token) return false;
  const base = getSpringOAuthApiBase();
  const url = `${base}/api/auth/session/bootstrap?bt=${encodeURIComponent(token)}`;
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
  });
  return response.ok;
}

/** @deprecated 프론트 callback OAuth — 사용하지 않음 */
export function getKakaoOAuthRedirectUri() {
  const origin = getBrowserOrigin();
  return origin ? `${origin}/oauth/kakao/callback` : "/oauth/kakao/callback";
}

/** @deprecated */
export async function completeKakaoOAuth() {
  throw createApiError("Spring OAuth2 로그인만 지원합니다.", 400);
}
