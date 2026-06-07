export const API_ERROR_TYPE = {
  UNKNOWN: "unknown",
  NETWORK: "network",
  AUTH: "auth",
  FORBIDDEN: "forbidden",
  NOT_FOUND: "not_found",
  VALIDATION: "validation",
  CONFLICT: "conflict",
  RATE_LIMIT: "rate_limit",
  SERVER: "server",
  CLIENT: "client",
  PARSE: "parse",
};

const DEFAULT_ERROR_MESSAGE = "요청 처리 중 오류가 발생했습니다.";

function isOptionBag(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return ["code", "type", "details", "source", "isRetryable", "isAuthError", "shouldLogout", "originalError"].some((key) =>
    Object.prototype.hasOwnProperty.call(value, key)
  );
}

export function getStatusDefaultMessage(status) {
  if (status === 0) return "네트워크 연결을 확인해주세요.";
  if (status === 400) return "잘못된 요청입니다.";
  if (status === 401) return "로그인이 만료되었습니다.";
  if (status === 403) return "요청 권한이 없습니다.";
  if (status === 404) return "요청한 정보를 찾을 수 없습니다.";
  if (status === 409) return "이미 처리된 요청이거나 충돌이 발생했습니다.";
  if (status === 422) return "입력값을 다시 확인해주세요.";
  if (status === 429) return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
  if (status >= 500) return "서버 처리 중 오류가 발생했습니다.";
  return DEFAULT_ERROR_MESSAGE;
}

function getErrorTypeFromCode(code, fallbackType) {
  const upper = typeof code === "string" ? code.toUpperCase() : "";
  if (!upper) return fallbackType;
  if (upper.includes("TOKEN") || upper.includes("AUTH") || upper.includes("UNAUTHORIZED")) return API_ERROR_TYPE.AUTH;
  if (upper.includes("FORBIDDEN")) return API_ERROR_TYPE.FORBIDDEN;
  if (upper.includes("NOT_FOUND")) return API_ERROR_TYPE.NOT_FOUND;
  if (upper.includes("VALIDATION") || upper.includes("BAD_REQUEST")) return API_ERROR_TYPE.VALIDATION;
  if (upper.includes("CONFLICT")) return API_ERROR_TYPE.CONFLICT;
  if (upper.includes("RATE_LIMIT") || upper.includes("TOO_MANY")) return API_ERROR_TYPE.RATE_LIMIT;
  if (upper.includes("PARSE")) return API_ERROR_TYPE.PARSE;
  return fallbackType;
}

function getErrorTypeFromStatus(status, code) {
  const fallbackType = (() => {
    if (status === 0) return API_ERROR_TYPE.NETWORK;
    if (status === 400 || status === 422) return API_ERROR_TYPE.VALIDATION;
    if (status === 401) return API_ERROR_TYPE.AUTH;
    if (status === 403) return API_ERROR_TYPE.FORBIDDEN;
    if (status === 404) return API_ERROR_TYPE.NOT_FOUND;
    if (status === 409) return API_ERROR_TYPE.CONFLICT;
    if (status === 429) return API_ERROR_TYPE.RATE_LIMIT;
    if (status >= 500) return API_ERROR_TYPE.SERVER;
    if (status >= 400) return API_ERROR_TYPE.CLIENT;
    return API_ERROR_TYPE.UNKNOWN;
  })();
  return getErrorTypeFromCode(code, fallbackType);
}

function getErrorCode(status, incomingCode) {
  if (typeof incomingCode === "string" && incomingCode.trim()) return incomingCode;
  if (status === 0) return "NETWORK_ERROR";
  if (status === 400) return "BAD_REQUEST";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 422) return "VALIDATION_ERROR";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "SERVER_ERROR";
  return "UNKNOWN_ERROR";
}

function getRetryable(type, status) {
  return type === API_ERROR_TYPE.NETWORK || type === API_ERROR_TYPE.RATE_LIMIT || status >= 500;
}

function buildErrorProps(message, status, options = {}) {
  const resolvedStatus = Number.isFinite(Number(status)) ? Number(status) : 500;
  const resolvedCode = getErrorCode(resolvedStatus, options.code);
  const resolvedType = options.type || getErrorTypeFromStatus(resolvedStatus, resolvedCode);
  const resolvedMessage =
    typeof message === "string" && message.trim() ? message : getStatusDefaultMessage(resolvedStatus);

  return {
    message: resolvedMessage,
    status: resolvedStatus,
    code: resolvedCode,
    type: resolvedType,
    details: options.details,
    source: options.source || "api",
    isRetryable: options.isRetryable ?? getRetryable(resolvedType, resolvedStatus),
    isAuthError: options.isAuthError ?? resolvedType === API_ERROR_TYPE.AUTH,
    shouldLogout: options.shouldLogout ?? resolvedType === API_ERROR_TYPE.AUTH,
    originalError: options.originalError || null,
  };
}

export class ApiError extends Error {
  constructor(options = {}) {
    const props = typeof options === "string" ? buildErrorProps(options, 500) : buildErrorProps(options.message, options.status, options);
    super(props.message);
    this.name = "ApiError";
    this.status = props.status;
    this.code = props.code;
    this.type = props.type;
    this.details = props.details;
    this.source = props.source;
    this.isRetryable = props.isRetryable;
    this.isAuthError = props.isAuthError;
    this.shouldLogout = props.shouldLogout;
    this.originalError = props.originalError;
    this.isApiError = true;
  }
}

export class NetworkError extends ApiError {
  constructor(options = {}) {
    const props = buildErrorProps(options.message, options.status ?? 0, {
      ...options,
      type: API_ERROR_TYPE.NETWORK,
      code: options.code || "NETWORK_ERROR",
      source: options.source || "network",
      isRetryable: options.isRetryable ?? true,
    });
    super(props);
    this.name = "NetworkError";
  }
}

export class ValidationError extends ApiError {
  constructor(options = {}) {
    const props = buildErrorProps(options.message, options.status ?? 400, {
      ...options,
      type: API_ERROR_TYPE.VALIDATION,
      code: options.code || "VALIDATION_ERROR",
    });
    super(props);
    this.name = "ValidationError";
  }
}

export class AuthError extends ApiError {
  constructor(options = {}) {
    const props = buildErrorProps(options.message, options.status ?? 401, {
      ...options,
      type: API_ERROR_TYPE.AUTH,
      code: options.code || "UNAUTHORIZED",
      isAuthError: true,
      shouldLogout: options.shouldLogout ?? true,
    });
    super(props);
    this.name = "AuthError";
  }
}

export class PermissionError extends ApiError {
  constructor(options = {}) {
    const props = buildErrorProps(options.message, options.status ?? 403, {
      ...options,
      type: API_ERROR_TYPE.FORBIDDEN,
      code: options.code || "FORBIDDEN",
    });
    super(props);
    this.name = "PermissionError";
  }
}

export class ConflictError extends ApiError {
  constructor(options = {}) {
    const props = buildErrorProps(options.message, options.status ?? 409, {
      ...options,
      type: API_ERROR_TYPE.CONFLICT,
      code: options.code || "CONFLICT",
    });
    super(props);
    this.name = "ConflictError";
  }
}

export function createApiErrorFromStatus(status, message, options = {}) {
  const props = buildErrorProps(message, status, options);
  const { type, status: resolvedStatus } = props;

  if (resolvedStatus === 0 || type === API_ERROR_TYPE.NETWORK) {
    return new NetworkError(props);
  }
  if (type === API_ERROR_TYPE.AUTH || resolvedStatus === 401) {
    return new AuthError(props);
  }
  if (type === API_ERROR_TYPE.FORBIDDEN || resolvedStatus === 403) {
    return new PermissionError(props);
  }
  if (type === API_ERROR_TYPE.VALIDATION || resolvedStatus === 400 || resolvedStatus === 422) {
    return new ValidationError(props);
  }
  if (type === API_ERROR_TYPE.CONFLICT || resolvedStatus === 409) {
    return new ConflictError(props);
  }
  return new ApiError(props);
}

export function isApiError(error) {
  return Boolean(error?.isApiError);
}

export function isNetworkError(error) {
  return error instanceof NetworkError || error?.type === API_ERROR_TYPE.NETWORK;
}

export function isValidationError(error) {
  return error instanceof ValidationError || error?.type === API_ERROR_TYPE.VALIDATION;
}

export function isAuthError(error) {
  return error instanceof AuthError || Boolean(error?.isAuthError);
}

export function isPermissionError(error) {
  return error instanceof PermissionError || error?.type === API_ERROR_TYPE.FORBIDDEN;
}

export function isConflictError(error) {
  return error instanceof ConflictError || error?.type === API_ERROR_TYPE.CONFLICT;
}

export function normalizeApiError(error, { defaultMessage = DEFAULT_ERROR_MESSAGE, status, code, details, source } = {}) {
  if (isApiError(error)) return error;
  if (typeof error === "string") {
    return createApiErrorFromStatus(status ?? 500, error, { code, details, source });
  }
  if (error instanceof TypeError) {
    return new NetworkError(
      buildErrorProps(defaultMessage || getStatusDefaultMessage(0), 0, {
        code: code || "NETWORK_ERROR",
        details,
        source: source || "network",
        originalError: error,
      })
    );
  }
  if (error instanceof Error) {
    return createApiErrorFromStatus(error.status ?? status ?? 500, error.message || defaultMessage, {
      code: code || error.code,
      type: error.type,
      details: details ?? error.details,
      source: source || error.source || "api",
      isRetryable: error.isRetryable,
      isAuthError: error.isAuthError,
      shouldLogout: error.shouldLogout,
      originalError: error,
    });
  }
  return createApiErrorFromStatus(status ?? 500, defaultMessage, { code, details, source });
}

export function getApiErrorMessage(error, fallbackMessage = DEFAULT_ERROR_MESSAGE) {
  return normalizeApiError(error, { defaultMessage: fallbackMessage }).message;
}

export function createApiError(message, status = 500, detailsOrOptions) {
  const options = isOptionBag(detailsOrOptions) ? detailsOrOptions : { details: detailsOrOptions };
  return createApiErrorFromStatus(status, message, options);
}
