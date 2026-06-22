import { createApiError, getApiBaseUrl } from "./client";
import { authDiag } from "../utils/authDiag";

function getBrowserOrigin() {
  if (typeof window === "undefined") return "";
  return String(window.location.origin || "").replace(/\/$/, "");
}

/** same-origin("") 포함 API URL 조립 */
export function buildApiUrl(path) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = getApiBaseUrl();
  if (!base) {
    return normalized;
  }
  return `${base}${normalized}`;
}

/**
 * 카카오 로그인 시작 URL — Spring OAuth2 단일 경로.
 * Vercel same-origin 프록시 또는 REACT_APP_API_BASE_URL/oauth2/authorization/kakao
 */
export function getKakaoOAuthStartUrl() {
  if (typeof window === "undefined" && !getApiBaseUrl()) {
    return null;
  }
  return buildApiUrl("/oauth2/authorization/kakao");
}

export function getSpringOAuthApiBase() {
  return getApiBaseUrl();
}

export function getKakaoRedirectMustMatch() {
  const origin = getBrowserOrigin();
  return origin ? `${origin}/login/oauth2/code/kakao` : "/login/oauth2/code/kakao";
}

async function readResponseBody(response) {
  const contentType = String(response.headers.get("Content-Type") || "").toLowerCase();
  try {
    if (contentType.includes("application/json")) {
      return await response.json();
    }
    const text = await response.text();
    return text.length > 500 ? `${text.slice(0, 500)}…` : text;
  } catch (error) {
    return { parseError: error?.message || String(error) };
  }
}

/** OAuth 시작 URL의 redirect_uri 파라미터 확인 */
export async function fetchOAuthConfigDiagnostics() {
  const oauthStartUrl = buildApiUrl("/oauth2/authorization/kakao");
  const kakaoRedirectMustMatch = getKakaoRedirectMustMatch();
  try {
    const response = await fetch(oauthStartUrl, {
      method: "GET",
      redirect: "manual",
      credentials: "omit",
    });
    const location = response.headers.get("Location") || "";
    let redirectUri = null;
    const match = location.match(/redirect_uri=([^&]+)/);
    if (match) {
      redirectUri = decodeURIComponent(match[1]);
    }
    const config = {
      oauthStartUrl,
      status: response.status,
      location,
      redirectUri,
      kakaoRedirectMustMatch,
      redirectUriMatches: redirectUri === kakaoRedirectMustMatch,
    };
    console.log("[AUTH-DIAG] oauth config response", JSON.stringify(config, null, 2));
    authDiag("oauth config response", config);
    return config;
  } catch (error) {
    const config = {
      oauthStartUrl,
      kakaoRedirectMustMatch,
      error: error?.message || String(error),
    };
    console.log("[AUTH-DIAG] oauth config response", JSON.stringify(config, null, 2));
    authDiag("oauth config response error", config);
    return config;
  }
}

/**
 * 백엔드 헬스 체크 — same-origin(Vercel 프록시) 지원.
 * @returns {{ ok: boolean, healthUrl: string, healthResponse: unknown, reason?: string }}
 */
export async function probeSpringOAuthBackend(timeoutMs = 2800) {
  if (String(process.env.REACT_APP_SKIP_OAUTH_PROBE || "").trim() === "true") {
    const skipped = { ok: true, healthUrl: "(skipped)", healthResponse: null, reason: "REACT_APP_SKIP_OAUTH_PROBE" };
    console.log("[AUTH-DIAG] health check skipped", skipped);
    return skipped;
  }

  const healthUrl = buildApiUrl("/api/health");
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);

  console.log("[AUTH-DIAG] health check request URL", healthUrl);

  try {
    const response = await fetch(healthUrl, {
      method: "GET",
      signal: ctrl.signal,
      credentials: "omit",
    });
    const healthResponse = await readResponseBody(response);
    console.log("[AUTH-DIAG] health check response", JSON.stringify({ status: response.status, ok: response.ok, body: healthResponse }, null, 2));

    const data = healthResponse && typeof healthResponse === "object" ? healthResponse.data ?? healthResponse : null;
    const up =
      response.ok &&
      (data?.status === "UP" ||
        healthResponse?.status === "UP" ||
        (healthResponse?.success === true && data?.status !== "DOWN"));

    const result = {
      ok: Boolean(up || response.ok),
      healthUrl,
      healthResponse,
      reason: up || response.ok ? undefined : "health not UP",
    };
    authDiag("health check result", result);
    return result;
  } catch (error) {
    const result = {
      ok: false,
      healthUrl,
      healthResponse: null,
      reason: error?.name === "AbortError" ? "health check timeout" : error?.message || String(error),
    };
    console.log("[AUTH-DIAG] health check failed", JSON.stringify(result, null, 2));
    authDiag("health check failed", result);
    return result;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function logoutSession() {
  try {
    await fetch(buildApiUrl("/logout"), {
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
  if (!token) {
    return { ok: false, status: 0, reason: "no_token", body: null };
  }
  const url = buildApiUrl(`/api/auth/session/bootstrap?bt=${encodeURIComponent(token)}`);
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      credentials: "include",
      redirect: "manual",
    });
  } catch (error) {
    return {
      ok: false,
      status: 0,
      reason: error?.message || "network_error",
      body: null,
    };
  }

  const contentType = String(response.headers.get("Content-Type") || "");
  let body = null;
  try {
    body = await readResponseBody(response);
  } catch {
    body = null;
  }

  if (response.type === "opaqueredirect" || response.status === 302 || response.status === 301) {
    return {
      ok: false,
      status: response.status,
      reason: "redirect",
      body,
    };
  }

  const ok = response.ok && contentType.includes("application/json");
  if (!ok) {
    console.warn("[AUTH-DIAG] bootstrap failed", {
      status: response.status,
      contentType,
      url,
      body,
    });
  }

  return {
    ok,
    status: response.status,
    reason: ok ? "success" : "http_error",
    body,
  };
}

/** Railway bootstrap API 배포 여부 확인 */
export async function probeSessionBootstrapApi() {
  try {
    const response = await fetch(buildApiUrl("/api/auth/session/status"), { credentials: "omit" });
    if (!response.ok) return false;
    const payload = await response.json();
    return payload?.data?.bootstrapAvailable === true;
  } catch {
    return false;
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
