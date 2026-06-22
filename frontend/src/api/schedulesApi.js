import { isMockApiEnabled, runApiRequest } from "./client";
import { readJsonStorage, removeStorageKey, writeJsonStorage } from "../store/storeUtils";
import { SCHEDULES_STORAGE_KEY } from "../utils/scheduleModel";
import { migrateSchedule } from "../utils/scheduleModel";
import { scheduleDiag, schedulePersistTrace, payloadByteLength } from "../utils/scheduleSyncDiag";

const LEGACY_SETTLEMENT_STORE_KEY = "ildangmap_settlement_store_v2";
const FIELD_OPS_STORAGE_KEY = "ildangmap.scheduleFieldOps.v1";
const MOCK_STORE_PREFIX = "ildangmap_schedules_server_mock_";

export { LEGACY_SETTLEMENT_STORE_KEY, FIELD_OPS_STORAGE_KEY };

export function emptySchedulesPayload() {
  return {
    schedules: [],
    fieldOps: {
      changeHistory: {},
      changeRequests: {},
      participantResponses: {},
    },
  };
}

export function normalizeSchedulesPayload(raw) {
  const base = emptySchedulesPayload();
  if (!raw || typeof raw !== "object") return base;
  const schedules = Array.isArray(raw.schedules) ? raw.schedules.map((s) => migrateSchedule(s)).filter(Boolean) : [];
  const fieldOpsRaw = raw.fieldOps && typeof raw.fieldOps === "object" ? raw.fieldOps : {};
  return {
    schedules,
    fieldOps: {
      changeHistory:
        fieldOpsRaw.changeHistory && typeof fieldOpsRaw.changeHistory === "object"
          ? { ...fieldOpsRaw.changeHistory }
          : {},
      changeRequests:
        fieldOpsRaw.changeRequests && typeof fieldOpsRaw.changeRequests === "object"
          ? { ...fieldOpsRaw.changeRequests }
          : {},
      participantResponses:
        fieldOpsRaw.participantResponses && typeof fieldOpsRaw.participantResponses === "object"
          ? { ...fieldOpsRaw.participantResponses }
          : {},
    },
  };
}

export function hasSchedulesPayload(payload) {
  if (!payload || typeof payload !== "object") return false;
  return (
    (Array.isArray(payload.schedules) && payload.schedules.length > 0) ||
    (payload.fieldOps &&
      typeof payload.fieldOps === "object" &&
      (Object.keys(payload.fieldOps.changeHistory || {}).length > 0 ||
        Object.keys(payload.fieldOps.changeRequests || {}).length > 0 ||
        Object.keys(payload.fieldOps.participantResponses || {}).length > 0))
  );
}

function readFieldOpsFromLegacyStorage() {
  const raw = readJsonStorage(FIELD_OPS_STORAGE_KEY, null);
  if (!raw || typeof raw !== "object") return emptySchedulesPayload().fieldOps;
  return {
    changeHistory: raw.changeHistory && typeof raw.changeHistory === "object" ? { ...raw.changeHistory } : {},
    changeRequests: raw.changeRequests && typeof raw.changeRequests === "object" ? { ...raw.changeRequests } : {},
    participantResponses:
      raw.participantResponses && typeof raw.participantResponses === "object"
        ? { ...raw.participantResponses }
        : {},
  };
}

/** Zustand persist + calendar_schedules_v2 레거시 → payload */
export function readLegacySchedulesLocalStorage() {
  const settlementRaw = readJsonStorage(LEGACY_SETTLEMENT_STORE_KEY, null);
  const settlementState =
    settlementRaw?.state && typeof settlementRaw.state === "object" ? settlementRaw.state : settlementRaw;
  const fromSettlement = Array.isArray(settlementState?.schedules) ? settlementState.schedules : [];
  const fromCalendar = readJsonStorage(SCHEDULES_STORAGE_KEY, []);
  const schedules = normalizeSchedulesPayload({
    schedules: fromSettlement.length ? fromSettlement : fromCalendar,
    fieldOps: readFieldOpsFromLegacyStorage(),
  }).schedules;
  if (!schedules.length && !hasSchedulesPayload({ schedules: [], fieldOps: readFieldOpsFromLegacyStorage() })) {
    return null;
  }
  return normalizeSchedulesPayload({
    schedules,
    fieldOps: readFieldOpsFromLegacyStorage(),
  });
}

export function applyFieldOpsToLegacyStorage(fieldOps) {
  if (!fieldOps || typeof fieldOps !== "object") return;
  writeJsonStorage(FIELD_OPS_STORAGE_KEY, {
    changeHistory: fieldOps.changeHistory || {},
    changeRequests: fieldOps.changeRequests || {},
    participantResponses: fieldOps.participantResponses || {},
  });
}

export function removeLegacySchedulesLocalStorage() {
  removeStorageKey(LEGACY_SETTLEMENT_STORE_KEY);
  removeStorageKey(SCHEDULES_STORAGE_KEY);
}

function mockStorageKey(userId) {
  return `${MOCK_STORE_PREFIX}${userId}`;
}

function readMockSchedules(userId) {
  return normalizeSchedulesPayload(readJsonStorage(mockStorageKey(userId), emptySchedulesPayload()));
}

function writeMockSchedules(userId, payload) {
  writeJsonStorage(mockStorageKey(userId), normalizeSchedulesPayload(payload));
}

function resolveUseMock() {
  return isMockApiEnabled();
}

export async function getSchedulesData() {
  scheduleDiag("GET /api/users/me/schedules");
  schedulePersistTrace("GET_START", { path: "/api/users/me/schedules" });
  try {
    const data = await runApiRequest({
      path: "/api/users/me/schedules",
      useMock: resolveUseMock(),
      mock: () => {
        const userId = readJsonStorage("ildangmap_user_store_v1", {})?.state?.profile?.id || 1;
        return readMockSchedules(userId);
      },
    });
    const scheduleCount = data?.schedules?.length ?? 0;
    scheduleDiag("GET /api/users/me/schedules response", { scheduleCount });
    schedulePersistTrace("GET_OK", {
      scheduleCount,
      payloadBytes: payloadByteLength(data),
      saveSuccess: true,
    });
    return data;
  } catch (error) {
    schedulePersistTrace("GET_FAIL", {
      scheduleCount: 0,
      saveSuccess: false,
      message: error?.message,
      status: error?.status,
      code: error?.code,
    });
    throw error;
  }
}

export async function putSchedulesData(payload) {
  const body = normalizeSchedulesPayload(payload);
  const scheduleCount = body.schedules?.length ?? 0;
  const payloadBytes = payloadByteLength(body);
  scheduleDiag("PUT /api/users/me/schedules", { scheduleCount });
  schedulePersistTrace("PUT_START", {
    path: "/api/users/me/schedules",
    scheduleCount,
    payloadBytes,
  });
  try {
    const saved = await runApiRequest({
      path: "/api/users/me/schedules",
      method: "PUT",
      body,
      redirect: "manual",
      useMock: resolveUseMock(),
      mock: () => {
        const userId = readJsonStorage("ildangmap_user_store_v1", {})?.state?.profile?.id || 1;
        writeMockSchedules(userId, body);
        return body;
      },
    });
    scheduleDiag("PUT /api/users/me/schedules response", {
      scheduleCount: saved?.schedules?.length ?? 0,
    });
    schedulePersistTrace("PUT_OK", {
      scheduleCount: saved?.schedules?.length ?? scheduleCount,
      payloadBytes: payloadByteLength(saved),
      saveSuccess: true,
      httpStatus: 200,
    });
    return saved;
  } catch (error) {
    schedulePersistTrace("PUT_FAIL", {
      scheduleCount,
      payloadBytes,
      saveSuccess: false,
      httpStatus: error?.status ?? null,
      message: error?.message,
      code: error?.code,
    });
    throw error;
  }
}
