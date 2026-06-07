import { createApiError } from "./client";

function getBrowserOrigin() {
  if (typeof window === "undefined") return "";
  return String(window.location.origin || "").replace(/\/$/, "");
}

/**
 * 카카오 로그인 시작 URL — Spring OAuth2 단일 경로.
 * REACT_APP_API_BASE_URL/oauth2/authorization/kakao
 */
export function getKakaoOAuthStartUrl() {
  const base = String(process.env.REACT_APP_API_BASE_URL || "").replace(/\/$/, "");
  if (!base) {
    return null;
  }
  return `${base}/oauth2/authorization/kakao`;
}

export function getSpringOAuthApiBase() {
  return String(process.env.REACT_APP_API_BASE_URL || "").replace(/\/$/, "");
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
  if (!base) return;
  try {
    await fetch(`${base}/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    /* noop */
  }
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
