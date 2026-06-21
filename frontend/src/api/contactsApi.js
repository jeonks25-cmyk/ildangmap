import { isMockApiEnabled, runApiRequest } from "./client";
import { readJsonStorage, removeStorageKey, writeJsonStorage } from "../store/storeUtils";

const LEGACY_STORE_KEY = "ildangmap_contacts_store_v1";
const MOCK_STORE_PREFIX = "ildangmap_contacts_server_mock_";

export { LEGACY_STORE_KEY };

export function emptyContactsPayload() {
  return {
    favoriteById: {},
    memoById: {},
    contactOverridesById: {},
    removedContactIds: [],
    groups: [],
    memberIdsByGroup: {},
    addedContacts: [],
    coworkHistory: [],
    coworkProcessedScheduleIds: [],
  };
}

export function hasContactsPayload(payload) {
  if (!payload || typeof payload !== "object") return false;
  return (
    (Array.isArray(payload.addedContacts) && payload.addedContacts.length > 0) ||
    (Array.isArray(payload.groups) && payload.groups.length > 0) ||
    Object.keys(payload.favoriteById || {}).length > 0 ||
    Object.keys(payload.memoById || {}).length > 0 ||
    Object.keys(payload.contactOverridesById || {}).length > 0 ||
    (Array.isArray(payload.removedContactIds) && payload.removedContactIds.length > 0) ||
    Object.keys(payload.memberIdsByGroup || {}).length > 0 ||
    (Array.isArray(payload.coworkHistory) && payload.coworkHistory.length > 0) ||
    (Array.isArray(payload.coworkProcessedScheduleIds) && payload.coworkProcessedScheduleIds.length > 0)
  );
}

export function normalizeContactsPayload(raw) {
  const base = emptyContactsPayload();
  if (!raw || typeof raw !== "object") return base;
  return {
    favoriteById: raw.favoriteById && typeof raw.favoriteById === "object" ? { ...raw.favoriteById } : {},
    memoById: raw.memoById && typeof raw.memoById === "object" ? { ...raw.memoById } : {},
    contactOverridesById:
      raw.contactOverridesById && typeof raw.contactOverridesById === "object" ? { ...raw.contactOverridesById } : {},
    removedContactIds: Array.isArray(raw.removedContactIds) ? [...raw.removedContactIds] : [],
    groups: Array.isArray(raw.groups) ? raw.groups.map((g) => ({ ...g })) : [],
    memberIdsByGroup:
      raw.memberIdsByGroup && typeof raw.memberIdsByGroup === "object" ? { ...raw.memberIdsByGroup } : {},
    addedContacts: Array.isArray(raw.addedContacts) ? raw.addedContacts.map((c) => ({ ...c })) : [],
    coworkHistory: Array.isArray(raw.coworkHistory) ? [...raw.coworkHistory] : [],
    coworkProcessedScheduleIds: Array.isArray(raw.coworkProcessedScheduleIds)
      ? [...raw.coworkProcessedScheduleIds]
      : [],
  };
}

/** Zustand persist v1 형식 → contacts payload */
export function readLegacyContactsLocalStorage() {
  const raw = readJsonStorage(LEGACY_STORE_KEY, null);
  if (!raw || typeof raw !== "object") return null;
  const state = raw.state && typeof raw.state === "object" ? raw.state : raw;
  return normalizeContactsPayload(state);
}

export function removeLegacyContactsLocalStorage() {
  removeStorageKey(LEGACY_STORE_KEY);
}

function mockStorageKey(userId) {
  return `${MOCK_STORE_PREFIX}${userId}`;
}

function readMockContacts(userId) {
  return normalizeContactsPayload(readJsonStorage(mockStorageKey(userId), emptyContactsPayload()));
}

function writeMockContacts(userId, payload) {
  writeJsonStorage(mockStorageKey(userId), normalizeContactsPayload(payload));
}

function resolveUseMock() {
  return isMockApiEnabled();
}

export async function getContactsData() {
  return runApiRequest({
    path: "/api/users/me/contacts",
    useMock: resolveUseMock(),
    mock: () => {
      const userId = readJsonStorage("ildangmap_user_store_v1", {})?.state?.profile?.id || 1;
      return readMockContacts(userId);
    },
  });
}

export async function putContactsData(payload) {
  const body = normalizeContactsPayload(payload);
  return runApiRequest({
    path: "/api/users/me/contacts",
    method: "PUT",
    body,
    useMock: resolveUseMock(),
    mock: () => {
      const userId = readJsonStorage("ildangmap_user_store_v1", {})?.state?.profile?.id || 1;
      writeMockContacts(userId, body);
      return body;
    },
  });
}

export async function createContactGroup(name, tradeHint) {
  return runApiRequest({
    path: "/api/users/me/contacts/groups",
    method: "POST",
    body: { name, tradeHint: tradeHint || null },
    useMock: resolveUseMock(),
    mock: async () => {
      const userId = readJsonStorage("ildangmap_user_store_v1", {})?.state?.profile?.id || 1;
      const current = readMockContacts(userId);
      const id = `grp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      current.groups.push({
        id,
        name: String(name || "").trim(),
        sortOrder: current.groups.length,
        createdAt: new Date().toISOString(),
        ...(tradeHint ? { tradeHint: String(tradeHint).trim() } : {}),
      });
      current.memberIdsByGroup[id] = [];
      writeMockContacts(userId, current);
      return current;
    },
  });
}

export async function updateContactGroupApi(groupId, patch = {}) {
  return runApiRequest({
    path: `/api/users/me/contacts/groups/${encodeURIComponent(groupId)}`,
    method: "PATCH",
    body: patch,
    useMock: resolveUseMock(),
    mock: async () => {
      const userId = readJsonStorage("ildangmap_user_store_v1", {})?.state?.profile?.id || 1;
      const current = readMockContacts(userId);
      current.groups = current.groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              ...(patch.name != null ? { name: String(patch.name).trim() } : {}),
              ...(patch.tradeHint != null
                ? patch.tradeHint
                  ? { tradeHint: String(patch.tradeHint).trim() }
                  : { tradeHint: undefined }
                : {}),
            }
          : g
      );
      writeMockContacts(userId, current);
      return current;
    },
  });
}

export async function deleteContactGroupApi(groupId) {
  return runApiRequest({
    path: `/api/users/me/contacts/groups/${encodeURIComponent(groupId)}`,
    method: "DELETE",
    useMock: resolveUseMock(),
    mock: async () => {
      const userId = readJsonStorage("ildangmap_user_store_v1", {})?.state?.profile?.id || 1;
      const current = readMockContacts(userId);
      current.groups = current.groups.filter((g) => g.id !== groupId);
      delete current.memberIdsByGroup[groupId];
      writeMockContacts(userId, current);
      return current;
    },
  });
}

export async function setContactFavoriteApi(contactId, favorite) {
  return runApiRequest({
    path: `/api/users/me/contacts/${encodeURIComponent(contactId)}/favorite`,
    method: "PATCH",
    body: { favorite: Boolean(favorite) },
    useMock: resolveUseMock(),
    mock: async () => {
      const userId = readJsonStorage("ildangmap_user_store_v1", {})?.state?.profile?.id || 1;
      const current = readMockContacts(userId);
      if (favorite) current.favoriteById[contactId] = true;
      else delete current.favoriteById[contactId];
      writeMockContacts(userId, current);
      return current;
    },
  });
}

export async function setContactMemoApi(contactId, memo) {
  return runApiRequest({
    path: `/api/users/me/contacts/${encodeURIComponent(contactId)}/memo`,
    method: "PATCH",
    body: { memo: String(memo || "").trim() },
    useMock: resolveUseMock(),
    mock: async () => {
      const userId = readJsonStorage("ildangmap_user_store_v1", {})?.state?.profile?.id || 1;
      const current = readMockContacts(userId);
      const clean = String(memo || "").trim();
      if (clean) current.memoById[contactId] = clean;
      else delete current.memoById[contactId];
      writeMockContacts(userId, current);
      return current;
    },
  });
}
