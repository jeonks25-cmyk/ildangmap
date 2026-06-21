import { create } from "zustand";
import { FIELD_CONTACTS_MOCK, normalizeFieldContact } from "../utils/fieldContactsMock";
import { applyCoworkFromEndedSchedules, deriveCoworkStats, listCoworkHistoryForContact } from "../utils/coworkHistoryModel";
import { formatRegionsLabel, normalizeActivityRegions } from "../constants/activityRegions";
import {
  emptyContactsPayload,
  getContactsData,
  hasContactsPayload,
  normalizeContactsPayload,
  putContactsData,
  readLegacyContactsLocalStorage,
  removeLegacyContactsLocalStorage,
} from "../api/contactsApi";
import { getApiErrorMessage } from "../api/client";

let contactsSyncTimer = null;
let contactsBootstrapInFlight = null;

function applyContactOverride(raw, overrides = {}) {
  if (!overrides || typeof overrides !== "object") return raw;
  const next = { ...raw, ...overrides, id: raw.id };
  if (overrides.homeRegions != null || overrides.homeRegion != null || overrides.region != null) {
    const regions = normalizeActivityRegions(overrides.homeRegions ?? overrides.homeRegion ?? overrides.region);
    next.homeRegions = regions;
    next.homeRegion = formatRegionsLabel(regions, { emptyLabel: "" });
  }
  if (overrides.basePay != null) {
    const pay = Number(overrides.basePay);
    next.basePay = Number.isFinite(pay) && pay > 0 ? pay : raw.basePay;
  }
  if (overrides.birthYear != null) {
    const year = Number(overrides.birthYear);
    next.birthYear = Number.isFinite(year) && year > 1900 ? year : raw.birthYear;
  }
  return next;
}

export function buildContactsList(
  favoriteById = {},
  memoById = {},
  addedContacts = [],
  contactOverridesById = {},
  removedContactIds = []
) {
  const removed = new Set((removedContactIds || []).map(String));
  const overlay = (raw) => {
    const merged = applyContactOverride(raw, contactOverridesById[raw.id]);
    return normalizeFieldContact(merged, {
      favorite: favoriteById[raw.id] ?? merged.favorite,
      memo: memoById[raw.id] ?? merged.memo,
    });
  };
  const base = FIELD_CONTACTS_MOCK.filter((raw) => !removed.has(String(raw.id))).map(overlay);
  const added = (Array.isArray(addedContacts) ? addedContacts : []).map(overlay);
  return [...base, ...added].filter(Boolean);
}

function scheduleContactsSync() {
  const state = useContactsStore.getState();
  if (!state.contactsUserId || !state.contactsLoaded) return;
  if (contactsSyncTimer) clearTimeout(contactsSyncTimer);
  contactsSyncTimer = setTimeout(() => {
    contactsSyncTimer = null;
    useContactsStore.getState().syncContactsToServer().catch(() => {
      /* error stored in contactsError */
    });
  }, 500);
}

function payloadFromState(state) {
  return normalizeContactsPayload({
    favoriteById: state.favoriteById,
    memoById: state.memoById,
    contactOverridesById: state.contactOverridesById,
    removedContactIds: state.removedContactIds,
    groups: state.groups,
    memberIdsByGroup: state.memberIdsByGroup,
    addedContacts: state.addedContacts,
    coworkHistory: state.coworkHistory,
    coworkProcessedScheduleIds: state.coworkProcessedScheduleIds,
  });
}

function applyPayloadToSet(set, payload) {
  const normalized = normalizeContactsPayload(payload);
  set({
    favoriteById: normalized.favoriteById,
    memoById: normalized.memoById,
    contactOverridesById: normalized.contactOverridesById,
    removedContactIds: normalized.removedContactIds,
    groups: normalized.groups,
    memberIdsByGroup: normalized.memberIdsByGroup,
    addedContacts: normalized.addedContacts,
    coworkHistory: normalized.coworkHistory,
    coworkProcessedScheduleIds: normalized.coworkProcessedScheduleIds,
  });
}

export const useContactsStore = create((set, get) => ({
  favoriteById: {},
  memoById: {},
  contactOverridesById: {},
  removedContactIds: [],
  groups: [],
  memberIdsByGroup: {},
  coworkHistory: [],
  coworkProcessedScheduleIds: [],
  addedContacts: [],

  contactsUserId: null,
  contactsLoaded: false,
  contactsLoading: false,
  contactsSyncing: false,
  contactsError: "",

  buildContactsPayload: () => payloadFromState(get()),

  applyContactsPayload: (payload) => {
    applyPayloadToSet(set, payload);
  },

  resetContacts: () => {
    if (contactsSyncTimer) {
      clearTimeout(contactsSyncTimer);
      contactsSyncTimer = null;
    }
    set({
      ...emptyContactsPayload(),
      contactsUserId: null,
      contactsLoaded: false,
      contactsLoading: false,
      contactsSyncing: false,
      contactsError: "",
    });
  },

  syncContactsToServer: async () => {
    const userId = get().contactsUserId;
    if (!userId || !get().contactsLoaded) return null;
    set({ contactsSyncing: true, contactsError: "" });
    try {
      const saved = await putContactsData(get().buildContactsPayload());
      applyPayloadToSet(set, saved);
      return saved;
    } catch (error) {
      set({ contactsError: getApiErrorMessage(error, "인원 정보를 저장하지 못했습니다.") });
      throw error;
    } finally {
      set({ contactsSyncing: false });
    }
  },

  bootstrapContacts: async (userId) => {
    const uid = userId != null && userId !== "" ? String(userId) : null;
    if (!uid) {
      get().resetContacts();
      return;
    }
    if (get().contactsUserId && get().contactsUserId !== uid) {
      get().resetContacts();
    }
    if (get().contactsLoaded && get().contactsUserId === uid) return;

    if (contactsBootstrapInFlight) return contactsBootstrapInFlight;

    const run = (async () => {
      set({ contactsLoading: true, contactsError: "" });
      try {
        const server = normalizeContactsPayload(await getContactsData());
        if (hasContactsPayload(server)) {
          get().applyContactsPayload(server);
          set({ contactsUserId: uid, contactsLoaded: true });
          return;
        }

        const legacy = readLegacyContactsLocalStorage();
        if (hasContactsPayload(legacy)) {
          get().applyContactsPayload(legacy);
          const saved = normalizeContactsPayload(await putContactsData(get().buildContactsPayload()));
          get().applyContactsPayload(saved);
          removeLegacyContactsLocalStorage();
          set({ contactsUserId: uid, contactsLoaded: true });
          return;
        }

        get().applyContactsPayload(emptyContactsPayload());
        set({ contactsUserId: uid, contactsLoaded: true });
      } catch (error) {
        const legacy = readLegacyContactsLocalStorage();
        if (hasContactsPayload(legacy)) {
          get().applyContactsPayload(legacy);
          set({
            contactsUserId: uid,
            contactsLoaded: true,
            contactsError: getApiErrorMessage(error, "인원 정보를 불러오지 못했습니다. 오프라인 데이터를 표시합니다."),
          });
          return;
        }
        set({
          contactsError: getApiErrorMessage(error, "인원 정보를 불러오지 못했습니다."),
          contactsUserId: uid,
          contactsLoaded: true,
        });
      } finally {
        set({ contactsLoading: false });
      }
    })();

    contactsBootstrapInFlight = run;
    try {
      await run;
    } finally {
      contactsBootstrapInFlight = null;
    }
  },

  getContacts: () =>
    buildContactsList(
      get().favoriteById,
      get().memoById,
      get().addedContacts,
      get().contactOverridesById,
      get().removedContactIds
    ),

  toggleFavorite: (contactId) => {
    const id = String(contactId);
    set((state) => {
      const list = buildContactsList(
        state.favoriteById,
        state.memoById,
        state.addedContacts,
        state.contactOverridesById,
        state.removedContactIds
      );
      const current = list.find((c) => c.id === id);
      const nextVal = !(current?.favorite ?? false);
      return {
        favoriteById: { ...state.favoriteById, [id]: nextVal },
      };
    });
    scheduleContactsSync();
  },

  setMemo: (contactId, memo) => {
    const id = String(contactId);
    set((state) => ({
      memoById: { ...state.memoById, [id]: String(memo || "").trim() },
    }));
    scheduleContactsSync();
  },

  addContact: (data = {}) => {
    const name = String(data.name || "").trim();
    if (!name) return null;
    const id = `u-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const record = {
      id,
      name,
      phone: String(data.phone || "").trim(),
      trade: String(data.trade || "").trim(),
      homeRegion: String(data.homeRegion || data.region || "").trim(),
      birthYear: Number.isFinite(Number(data.birthYear)) ? Number(data.birthYear) : null,
      userId: Number.isFinite(Number(data.userId)) ? Number(data.userId) : null,
      source: data.source === "appuser" ? "appuser" : "manual",
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ addedContacts: [...state.addedContacts, record] }));
    scheduleContactsSync();
    return id;
  },

  updateContact: (contactId, patch = {}) => {
    get().updateContactFields(contactId, patch);
  },

  updateContactFields: (contactId, patch = {}) => {
    const id = String(contactId);
    if (!id) return;
    const clean = { ...patch };
    if (clean.homeRegions != null || clean.homeRegion != null || clean.region != null) {
      const regions = normalizeActivityRegions(clean.homeRegions ?? clean.homeRegion ?? clean.region);
      clean.homeRegions = regions;
      clean.homeRegion = formatRegionsLabel(regions, { emptyLabel: "" });
      delete clean.region;
    }
    if (clean.phone != null) clean.phone = String(clean.phone).trim();
    if (clean.nickname != null) clean.nickname = String(clean.nickname).trim();
    if (clean.name != null) clean.name = String(clean.name).trim();
    if (clean.basePay != null) {
      const pay = Number(String(clean.basePay).replace(/[^\d]/g, ""));
      clean.basePay = Number.isFinite(pay) && pay > 0 ? pay : null;
    }
    if (clean.birthYear != null) {
      const year = Number(String(clean.birthYear).replace(/[^\d]/g, ""));
      clean.birthYear = Number.isFinite(year) && year > 1900 ? year : null;
    }
    if (clean.trade != null) clean.trade = String(clean.trade).trim() || "film";
    if (clean.experienceYears != null) {
      const years = Number(String(clean.experienceYears).replace(/[^\d]/g, ""));
      clean.experienceYears = Number.isFinite(years) && years >= 0 ? years : null;
    }

    set((state) => {
      const isAdded = state.addedContacts.some((c) => c.id === id);
      if (isAdded) {
        return {
          addedContacts: state.addedContacts.map((c) => (c.id === id ? { ...c, ...clean, id: c.id } : c)),
        };
      }
      return {
        contactOverridesById: {
          ...state.contactOverridesById,
          [id]: { ...(state.contactOverridesById[id] || {}), ...clean },
        },
      };
    });
    scheduleContactsSync();
  },

  deleteContact: (contactId) => {
    const id = String(contactId);
    if (!id) return;
    set((state) => {
      const isAdded = state.addedContacts.some((c) => c.id === id);
      const nextMembers = {};
      Object.keys(state.memberIdsByGroup).forEach((gid) => {
        nextMembers[gid] = (state.memberIdsByGroup[gid] || []).filter((cid) => cid !== id);
      });
      const nextFavorite = { ...state.favoriteById };
      delete nextFavorite[id];
      const nextMemo = { ...state.memoById };
      delete nextMemo[id];
      const nextOverrides = { ...state.contactOverridesById };
      delete nextOverrides[id];

      if (isAdded) {
        return {
          addedContacts: state.addedContacts.filter((c) => c.id !== id),
          memberIdsByGroup: nextMembers,
          favoriteById: nextFavorite,
          memoById: nextMemo,
          contactOverridesById: nextOverrides,
        };
      }

      const removed = state.removedContactIds.includes(id)
        ? state.removedContactIds
        : [...state.removedContactIds, id];
      return {
        removedContactIds: removed,
        memberIdsByGroup: nextMembers,
        favoriteById: nextFavorite,
        memoById: nextMemo,
        contactOverridesById: nextOverrides,
      };
    });
    scheduleContactsSync();
  },

  linkInvitedContact: ({ contactId, phone, groupId, joinedUserId, joinedName, joinedResidence } = {}) => {
    const targetId = contactId != null ? String(contactId) : null;
    const phoneDigits = String(phone || "").replace(/[^\d]/g, "");
    const list = get().addedContacts;

    const match =
      (targetId && list.find((c) => c.id === targetId)) ||
      (phoneDigits &&
        list.find((c) => c.source === "manual" && String(c.phone || "").replace(/[^\d]/g, "") === phoneDigits)) ||
      null;
    if (!match) return null;

    set((state) => ({
      addedContacts: state.addedContacts.map((c) =>
        c.id === match.id
          ? {
              ...c,
              source: "appuser",
              userId: Number.isFinite(Number(joinedUserId)) ? Number(joinedUserId) : c.userId,
              name: c.name || String(joinedName || "").trim() || c.name,
              homeRegion: c.homeRegion || String(joinedResidence || "").trim(),
            }
          : c
      ),
    }));

    if (groupId) get().addToGroup(groupId, match.id);
    else scheduleContactsSync();
    return match.id;
  },

  removeAddedContact: (contactId) => {
    const id = String(contactId);
    set((state) => {
      const nextMembers = {};
      Object.keys(state.memberIdsByGroup).forEach((gid) => {
        nextMembers[gid] = (state.memberIdsByGroup[gid] || []).filter((cid) => cid !== id);
      });
      return {
        addedContacts: state.addedContacts.filter((c) => c.id !== id),
        memberIdsByGroup: nextMembers,
      };
    });
    scheduleContactsSync();
  },

  createGroup: (name) => {
    const clean = String(name || "").trim();
    if (!clean) return null;
    const id = `grp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((state) => ({
      groups: [
        ...state.groups,
        { id, name: clean, sortOrder: state.groups.length, createdAt: new Date().toISOString() },
      ],
      memberIdsByGroup: { ...state.memberIdsByGroup, [id]: [] },
    }));
    scheduleContactsSync();
    return id;
  },

  renameGroup: (groupId, name) => {
    const clean = String(name || "").trim();
    if (!groupId || !clean) return;
    set((state) => ({
      groups: state.groups.map((g) => (g.id === groupId ? { ...g, name: clean } : g)),
    }));
    scheduleContactsSync();
  },

  setGroupTradeHint: (groupId, tradeHint) => {
    if (!groupId) return;
    const next = tradeHint ? String(tradeHint).trim() : null;
    set((state) => ({
      groups: state.groups.map((g) => (g.id === groupId ? { ...g, tradeHint: next || undefined } : g)),
    }));
    scheduleContactsSync();
  },

  deleteGroup: (groupId) => {
    if (!groupId) return;
    set((state) => {
      const nextMembers = { ...state.memberIdsByGroup };
      delete nextMembers[groupId];
      return {
        groups: state.groups.filter((g) => g.id !== groupId),
        memberIdsByGroup: nextMembers,
      };
    });
    scheduleContactsSync();
  },

  addToGroup: (groupId, contactId) => {
    const cid = String(contactId);
    if (!groupId || !cid) return;
    set((state) => {
      const current = state.memberIdsByGroup[groupId] || [];
      if (current.includes(cid)) return {};
      return {
        memberIdsByGroup: { ...state.memberIdsByGroup, [groupId]: [...current, cid] },
      };
    });
    scheduleContactsSync();
  },

  removeFromGroup: (groupId, contactId) => {
    const cid = String(contactId);
    if (!groupId || !cid) return;
    set((state) => {
      const current = state.memberIdsByGroup[groupId] || [];
      if (!current.includes(cid)) return {};
      return {
        memberIdsByGroup: { ...state.memberIdsByGroup, [groupId]: current.filter((x) => x !== cid) },
      };
    });
    scheduleContactsSync();
  },

  getCoworkStats: (contactId) => deriveCoworkStats(contactId, get().coworkHistory),

  getCoworkHistoryForContact: (contactId, limit = null) =>
    listCoworkHistoryForContact(contactId, get().coworkHistory, limit),

  syncCoworkFromSchedules: (schedules) => {
    const contacts = get().getContacts();
    let processedIds = get().coworkProcessedScheduleIds;
    const history = get().coworkHistory;
    if (history.length === 0 && processedIds.length > 0) {
      processedIds = [];
    }
    const result = applyCoworkFromEndedSchedules({
      schedules,
      contacts,
      coworkHistory: history,
      processedScheduleIds: processedIds,
    });
    if (result.newlyProcessedCount === 0) return 0;
    set({
      coworkHistory: result.coworkHistory,
      coworkProcessedScheduleIds: result.processedScheduleIds,
    });
    scheduleContactsSync();
    return result.newlyProcessedCount;
  },
}));
