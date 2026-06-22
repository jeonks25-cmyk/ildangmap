import { bootstrapSessionFromToken } from "../api/authApi";
import { getMe } from "../api/userApi";
import { authDiag } from "./authDiag";

const BOOTSTRAP_DONE_PREFIX = "ildangmap_bt_consumed:";
let bootstrapInFlightPromise = null;
let lastConsumedToken = null;

/** document.cookie 기준 ILDANGMAPSESSION 존재 여부 (HttpOnly는 여기 안 보일 수 있음) */
export function hasVisibleIldangmapSessionCookie() {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) => part.trim().startsWith("ILDANGMAPSESSION="));
}

export function logIldangmapSessionCookie(label = "cookie check") {
  const visible = hasVisibleIldangmapSessionCookie();
  const payload = {
    label,
    visibleInDocumentCookie: visible,
    hint: visible
      ? "document.cookie에 ILDANGMAPSESSION 있음"
      : "HttpOnly 쿠키는 document.cookie에 안 보일 수 있음 — DevTools Application → Cookies 확인",
    hostname: typeof window !== "undefined" ? window.location.hostname : "",
  };
  console.log("[AUTH-DIAG] ILDANGMAPSESSION", payload);
  authDiag("ILDANGMAPSESSION cookie", payload);
  return visible;
}

function bootstrapDoneKey(token) {
  return `${BOOTSTRAP_DONE_PREFIX}${token}`;
}

function markBootstrapConsumed(token) {
  lastConsumedToken = token;
  try {
    sessionStorage.setItem(bootstrapDoneKey(token), String(Date.now()));
  } catch {
    /* noop */
  }
}

function wasBootstrapConsumed(token) {
  if (lastConsumedToken === token) return true;
  try {
    return sessionStorage.getItem(bootstrapDoneKey(token)) != null;
  } catch {
    return false;
  }
}

/**
 * POST /api/auth/session/bootstrap — 프로세스당 토큰 1회만 호출
 * @returns {Promise<{ ok: boolean, status?: number, skipped?: boolean, reason?: string, body?: unknown }>}
 */
export async function bootstrapSessionOnce(bootstrapToken, { source = "unknown" } = {}) {
  const token = String(bootstrapToken || "").trim();
  if (!token) {
    const empty = { ok: false, reason: "no_token" };
    console.log("[AUTH-DIAG] bootstrap 호출 결과", { source, ...empty });
    return empty;
  }

  if (wasBootstrapConsumed(token)) {
    const skipped = { ok: true, skipped: true, reason: "already_consumed" };
    console.log("[AUTH-DIAG] bootstrap 호출 스킵 (이미 사용된 bt)", { source });
    console.log("[AUTH-DIAG] bootstrap 호출 결과", { source, ...skipped });
    return skipped;
  }

  if (bootstrapInFlightPromise) {
    console.log("[AUTH-DIAG] bootstrap in-flight 재사용", { source });
    return bootstrapInFlightPromise;
  }

  console.log("[AUTH-DIAG] bootstrap 호출 시작", {
    source,
    btPreview: `${token.slice(0, 12)}…`,
  });

  bootstrapInFlightPromise = (async () => {
    const result = await bootstrapSessionFromToken(token);
    if (result.ok) {
      markBootstrapConsumed(token);
    }
    console.log("[AUTH-DIAG] bootstrap 호출 결과", {
      source,
      ok: result.ok,
      status: result.status,
      reason: result.reason,
    });
    return result;
  })();

  try {
    return await bootstrapInFlightPromise;
  } finally {
    bootstrapInFlightPromise = null;
  }
}

/** bootstrap 직후 GET /api/users/me — 스토어 갱신 전 스냅샷 */
export async function fetchMeSnapshotAfterBootstrap() {
  const me = await getMe();
  const snapshot = {
    id: me?.id ?? me?.userId ?? null,
    nickname: me?.displayNickname ?? me?.nickname ?? null,
    authenticated: me?.id != null || me?.userId != null,
  };
  console.log("[AUTH-DIAG] GET /api/users/me after bootstrap", snapshot);
  authDiag("GET /api/users/me after bootstrap", snapshot);
  return { me, snapshot };
}
