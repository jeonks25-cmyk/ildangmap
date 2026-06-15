import {
  API_ERROR_TYPE,
  ApiError,
  AuthError,
  ConflictError,
  NetworkError,
  PermissionError,
  ValidationError,
  createApiError,
  createApiErrorFromStatus,
  getApiErrorMessage,
  getStatusDefaultMessage,
  isApiError,
  isAuthError,
  isConflictError,
  isNetworkError,
  isPermissionError,
  isValidationError,
  normalizeApiError,
} from "./errors";
import {
  logApiNetworkFailureOnce,
  markBackendReachable,
  markBackendUnreachable,
  shouldSkipLiveApiRequest,
} from "./apiReachability";

export {
  API_ERROR_TYPE,
  ApiError,
  AuthError,
  ConflictError,
  NetworkError,
  PermissionError,
  ValidationError,
  createApiError,
  createApiErrorFromStatus,
  getApiErrorMessage,
  getStatusDefaultMessage,
  isApiError,
  isAuthError,
  isConflictError,
  isNetworkError,
  isPermissionError,
  isValidationError,
  normalizeApiError,
};

const DEFAULT_MOCK_DELAY_MS = Number(process.env.REACT_APP_MOCK_DELAY_MS || 300);

/**
 * API 베이스 URL.
 * Vercel(vercel.json → Railway 프록시)에서는 same-origin("")으로 세션 쿠키를 보낸다.
 */
export function getApiBaseUrl() {
  const fromEnv = String(process.env.REACT_APP_API_BASE_URL || "").replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const host = String(window.location.hostname || "");
    if (host.endsWith(".vercel.app")) {
      return "";
    }
  }
  return fromEnv;
}

/** 프로덕션 빌드에서는 목 API 기본 OFF (REACT_APP_USE_MOCK_API=true 로만 켬). 개발은 기본 ON. */
const USE_MOCK_API =
  process.env.NODE_ENV === "production"
    ? process.env.REACT_APP_USE_MOCK_API === "true"
    : process.env.REACT_APP_USE_MOCK_API !== "false";

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function extractErrorMessage(payload, fallbackMessage) {
  if (typeof payload === "string" && payload.trim()) return payload;
  if (payload && typeof payload === "object" && typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }
  return fallbackMessage;
}

function normalizeDelayMs(value) {
  return Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : DEFAULT_MOCK_DELAY_MS;
}

function unwrapApiEnvelope(payload, status = 200) {
  if (!payload || typeof payload !== "object") return payload;
  if (!Object.prototype.hasOwnProperty.call(payload, "success")) return payload;
  if (payload.success === false) {
    throw createApiError(
      extractErrorMessage(payload, getStatusDefaultMessage(status >= 400 ? status : 500)),
      status >= 400 ? status : 500,
      {
        code: payload.code,
        details: payload,
        source: "response",
      }
    );
  }
  if (Object.prototype.hasOwnProperty.call(payload, "data")) {
    return payload.data;
  }
  return payload;
}

async function readResponsePayload(response) {
  if (response.status === 204) return null;
  const contentType = String(response.headers.get("Content-Type") || "").toLowerCase();

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch (error) {
      throw createApiError("서버 응답을 해석하지 못했습니다.", response.status, {
        code: "INVALID_JSON_RESPONSE",
        type: API_ERROR_TYPE.PARSE,
        details: { contentType },
        source: "response",
        originalError: error,
      });
    }
  }

  try {
    const text = await response.text();
    return text || null;
  } catch (error) {
    throw createApiError("서버 응답을 읽지 못했습니다.", response.status, {
      code: "UNREADABLE_RESPONSE",
      type: API_ERROR_TYPE.PARSE,
      source: "response",
      originalError: error,
    });
  }
}

export function isMockApiEnabled() {
  return USE_MOCK_API;
}

/** 개발 빌드에서 백엔드 없이 목 로그인 버튼 노출 (REACT_APP_DEV_LOGIN_SHORTCUT=false 로 끔) */
export function isDevLoginShortcutEnabled() {
  return process.env.NODE_ENV === "development" && String(process.env.REACT_APP_DEV_LOGIN_SHORTCUT || "").trim() !== "false";
}

export function getMockDelayMs(overrideMs) {
  return normalizeDelayMs(overrideMs);
}

export async function mockRequest(factory, { delayMs } = {}) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      Promise.resolve()
        .then(() => (typeof factory === "function" ? factory() : factory))
        .then((data) => {
          resolve(cloneJson(data));
        })
        .catch((error) => {
          reject(normalizeApiError(error));
        });
    }, normalizeDelayMs(delayMs));
  });
}

export async function request(path, { method = "GET", body, headers, ...rest } = {}) {
  if (shouldSkipLiveApiRequest(false)) {
    throw normalizeApiError(new TypeError("Failed to fetch"), {
      defaultMessage: getStatusDefaultMessage(0),
      status: 0,
      source: "network",
    });
  }

  let response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      credentials: rest.credentials ?? (USE_MOCK_API ? "same-origin" : "include"),
      headers: {
        "Content-Type": "application/json",
        ...(headers || {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      ...rest,
    });
  } catch (error) {
    markBackendUnreachable();
    const normalized = normalizeApiError(error, {
      defaultMessage: getStatusDefaultMessage(0),
      status: 0,
      source: "network",
    });
    logApiNetworkFailureOnce(path, normalized);
    throw normalized;
  }

  markBackendReachable();

  const payload = await readResponsePayload(response);

  if (!response.ok) {
    throw createApiError(extractErrorMessage(payload, getStatusDefaultMessage(response.status)), response.status, {
      code: payload && typeof payload === "object" ? payload.code : undefined,
      details: payload,
      source: "response",
    });
  }

  if (response.status === 204) return null;
  return unwrapApiEnvelope(payload, response.status);
}

function resolveUseMock(useMock) {
  if (typeof useMock === "boolean") return useMock;
  return isMockApiEnabled();
}

export async function runApiRequest({ path, method = "GET", body, headers, mock, delayMs, useMock, ...rest } = {}) {
  const useMockResolved = resolveUseMock(useMock);
  if (useMockResolved) {
    return mockRequest(mock, { delayMs });
  }
  if (shouldSkipLiveApiRequest(false)) {
    const err = normalizeApiError(new TypeError("Failed to fetch"), {
      defaultMessage: getStatusDefaultMessage(0),
      status: 0,
      source: "network",
    });
    logApiNetworkFailureOnce(path, err);
    throw err;
  }
  return request(path, { method, body, headers, ...rest });
}

export { isBackendUnreachable } from "./apiReachability";
