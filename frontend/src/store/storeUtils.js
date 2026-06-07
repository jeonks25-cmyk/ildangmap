import { createJSONStorage } from "zustand/middleware";
import {
  getApiErrorMessage,
  isAuthError,
  isConflictError,
  isValidationError,
  normalizeApiError,
} from "../api/client";

export { getApiErrorMessage, isAuthError, isConflictError, isValidationError, normalizeApiError };

export function readJsonStorage(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}

export function writeJsonStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {
    /* noop */
  }
}

export function removeStorageKey(key) {
  try {
    localStorage.removeItem(key);
  } catch (_) {
    /* noop */
  }
}

export function createSafeJsonStorage() {
  return createJSONStorage(() => localStorage);
}

export function resolveUpdater(currentValue, nextValueOrUpdater) {
  return typeof nextValueOrUpdater === "function" ? nextValueOrUpdater(currentValue) : nextValueOrUpdater;
}

export function pickPersistedStoreState(state, keys) {
  return keys.reduce((acc, key) => {
    acc[key] = state[key];
    return acc;
  }, {});
}

function resolveStorePatch(patch, state, payload) {
  if (!patch) return {};
  return typeof patch === "function" ? patch(state, payload) || {} : patch;
}

export async function runAsyncStoreAction({
  set,
  action,
  loadingKey = "loading",
  errorKey = "error",
  defaultErrorMessage = "요청 처리 중 오류가 발생했습니다.",
  onStart,
  onSuccess,
  onError,
}) {
  set((state) => ({
    ...(loadingKey ? { [loadingKey]: true } : {}),
    ...(errorKey ? { [errorKey]: "" } : {}),
    ...resolveStorePatch(onStart, state),
  }));

  try {
    const result = await action();
    set((state) => ({
      ...(loadingKey ? { [loadingKey]: false } : {}),
      ...(errorKey ? { [errorKey]: "" } : {}),
      ...resolveStorePatch(onSuccess, state, result),
    }));
    return result;
  } catch (error) {
    const normalizedError = normalizeApiError(error, { defaultMessage: defaultErrorMessage, source: "store-action" });
    set((state) => ({
      ...(loadingKey ? { [loadingKey]: false } : {}),
      ...(errorKey ? { [errorKey]: getApiErrorMessage(normalizedError, defaultErrorMessage) } : {}),
      ...resolveStorePatch(onError, state, normalizedError),
    }));
    throw normalizedError;
  }
}
