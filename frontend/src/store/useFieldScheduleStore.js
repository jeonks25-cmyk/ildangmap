import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FIELD_CONTACTS_MOCK } from "../utils/fieldContactsMock";
import {
  createPersonalEvent,
  DAY_STATUS,
  scheduleDateKeyFromWorkDate,
  toDateKey,
} from "../utils/fieldScheduleModel";
import { getScheduleDateKeys } from "../utils/scheduleModel";
import { createSafeJsonStorage, pickPersistedStoreState } from "./storeUtils";

const STORE_KEY = "ildangmap_field_schedule_v1";
const DEFAULT_OWNER = "me";
const EMPTY_PERSONAL_EVENTS = [];

export function selectPersonalEventsForOwner(state, ownerId = DEFAULT_OWNER) {
  return state.personalEventsByOwner[ownerId] ?? EMPTY_PERSONAL_EVENTS;
}

function hashOwnerDay(ownerId, dateKey) {
  const seed = `${ownerId}:${dateKey}`;
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) % 9973;
  return h;
}

function seedAvailabilityMap(ownerId, start = new Date(), days = 42) {
  const map = {};
  const cursor = new Date(start);
  for (let i = 0; i < days; i += 1) {
    const key = toDateKey(cursor);
    map[key] = hashOwnerDay(ownerId, key) % 5 === 0 ? DAY_STATUS.unavailable : DAY_STATUS.available;
    cursor.setDate(cursor.getDate() + 1);
  }
  return map;
}

function bumpRevision(revisions, ownerId) {
  return { ...revisions, [ownerId]: Date.now() };
}

export function resolveScheduleOwnerId(contactOrId) {
  if (!contactOrId) return DEFAULT_OWNER;
  if (typeof contactOrId === "string") return contactOrId;
  return contactOrId.scheduleOwnerId || contactOrId.id || DEFAULT_OWNER;
}

export const useFieldScheduleStore = create(
  persist(
    (set, get) => ({
      /** @type {Record<string, Record<string, 'available'|'unavailable'>>} */
      availabilityByOwner: {},
      /** @type {Record<string, import('../utils/fieldScheduleModel').PersonalEvent[]>} */
      personalEventsByOwner: {},
      /** @type {Record<string, number>} */
      revisionsByOwner: {},
      seeded: false,

      ensureSeeded: () => {
        if (get().seeded) return;
        const availabilityByOwner = { ...get().availabilityByOwner };
        const personalEventsByOwner = { ...get().personalEventsByOwner };
        const revisionsByOwner = { ...get().revisionsByOwner };

        if (!availabilityByOwner[DEFAULT_OWNER]) {
          availabilityByOwner[DEFAULT_OWNER] = seedAvailabilityMap(DEFAULT_OWNER);
        }

        if (!(personalEventsByOwner[DEFAULT_OWNER] || []).length) {
          personalEventsByOwner[DEFAULT_OWNER] = [
            createPersonalEvent({ title: "치과", dateKey: toDateKey(new Date()), color: "blue", startTime: "10:00", endTime: "11:00" }),
            createPersonalEvent({
              title: "가족여행",
              dateKey: (() => {
                const d = new Date();
                d.setDate(d.getDate() + 3);
                return toDateKey(d);
              })(),
              color: "purple",
              startTime: "00:00",
              endTime: "23:59",
              memo: "제주",
            }),
          ].filter(Boolean);
        }

        FIELD_CONTACTS_MOCK.forEach((raw) => {
          const ownerId = String(raw.id);
          if (!availabilityByOwner[ownerId]) {
            availabilityByOwner[ownerId] =
              raw.availability && typeof raw.availability === "object"
                ? { ...raw.availability }
                : seedAvailabilityMap(ownerId);
          }
        });

        set({
          availabilityByOwner,
          personalEventsByOwner,
          revisionsByOwner,
          seeded: true,
        });
      },

      getOwnerRevision: (ownerId) => get().revisionsByOwner[ownerId] || 0,

      getExplicitDayStatus: (ownerId, dateKey) => {
        const map = get().availabilityByOwner[ownerId];
        const raw = map?.[dateKey];
        if (raw === DAY_STATUS.available || raw === DAY_STATUS.unavailable) return raw;
        return null;
      },

      getPersonalEventsOnDay: (ownerId, dateKey) => {
        const list = get().personalEventsByOwner[ownerId] || [];
        return list.filter((e) => e.dateKey === dateKey);
      },

      getFieldDateKeysForOwner: (ownerId, schedules = []) => {
        if (ownerId !== DEFAULT_OWNER) {
          return new Set();
        }
        const keys = new Set();
        (Array.isArray(schedules) ? schedules : []).forEach((s) => {
          const range = getScheduleDateKeys(s);
          if (range.length) {
            range.forEach((key) => keys.add(key));
            return;
          }
          const k = scheduleDateKeyFromWorkDate(s?.workDate);
          if (k) keys.add(k);
        });
        return keys;
      },

      /** 연락처·외부 공개용 — 상세 일정 없이 가능/불가만 */
      getPublicDayStatus: (ownerId, dateKey, fieldDateKeys = null) => {
        get().ensureSeeded();
        const explicit = get().getExplicitDayStatus(ownerId, dateKey);
        if (explicit) return explicit;

        const personal = get().getPersonalEventsOnDay(ownerId, dateKey);
        if (personal.length > 0) return DAY_STATUS.unavailable;

        const fieldKeys =
          fieldDateKeys instanceof Set
            ? fieldDateKeys
            : get().getFieldDateKeysForOwner(ownerId, fieldDateKeys);
        if (fieldKeys instanceof Set && fieldKeys.has(dateKey)) return DAY_STATUS.unavailable;

        return DAY_STATUS.available;
      },

      setDayStatus: (ownerId, dateKey, status) => {
        if (!dateKey || !DAY_STATUS[status]) return;
        set((state) => ({
          availabilityByOwner: {
            ...state.availabilityByOwner,
            [ownerId]: {
              ...(state.availabilityByOwner[ownerId] || {}),
              [dateKey]: status,
            },
          },
          revisionsByOwner: bumpRevision(state.revisionsByOwner, ownerId),
        }));
      },

      toggleDayStatus: (ownerId, dateKey, fieldDateKeys = []) => {
        const current = get().getPublicDayStatus(ownerId, dateKey, fieldDateKeys);
        const next = current === DAY_STATUS.available ? DAY_STATUS.unavailable : DAY_STATUS.available;
        get().setDayStatus(ownerId, dateKey, next);
        return next;
      },

      addPersonalEvent: (ownerId, payload) => {
        const event = createPersonalEvent(payload);
        if (!event) return null;
        const eventDateKey = event.dateKey;
        set((state) => {
          const list = state.personalEventsByOwner[ownerId] || [];
          return {
            personalEventsByOwner: {
              ...state.personalEventsByOwner,
              [ownerId]: [...list, event],
            },
            availabilityByOwner: {
              ...state.availabilityByOwner,
              [ownerId]: {
                ...(state.availabilityByOwner[ownerId] || {}),
                [eventDateKey]: DAY_STATUS.unavailable,
              },
            },
            revisionsByOwner: bumpRevision(state.revisionsByOwner, ownerId),
          };
        });
        return event;
      },

      updatePersonalEvent: (ownerId, eventId, patch = {}) => {
        set((state) => {
          const list = (state.personalEventsByOwner[ownerId] || []).map((e) => {
            if (e.id !== eventId) return e;
            return {
              ...e,
              ...(patch.title != null ? { title: String(patch.title).trim() } : {}),
              ...(patch.dateKey != null ? { dateKey: patch.dateKey } : {}),
              ...(patch.color != null ? { color: patch.color } : {}),
              ...(patch.startTime != null ? { startTime: patch.startTime } : {}),
              ...(patch.endTime != null ? { endTime: patch.endTime } : {}),
              ...(patch.memo != null ? { memo: String(patch.memo).trim() } : {}),
              updatedAt: new Date().toISOString(),
            };
          });
          return {
            personalEventsByOwner: { ...state.personalEventsByOwner, [ownerId]: list },
            revisionsByOwner: bumpRevision(state.revisionsByOwner, ownerId),
          };
        });
      },

      removePersonalEvent: (ownerId, eventId) => {
        set((state) => ({
          personalEventsByOwner: {
            ...state.personalEventsByOwner,
            [ownerId]: (state.personalEventsByOwner[ownerId] || []).filter((e) => e.id !== eventId),
          },
          revisionsByOwner: bumpRevision(state.revisionsByOwner, ownerId),
        }));
      },

      listPersonalEvents: (ownerId) => get().personalEventsByOwner[ownerId] || [],
    }),
    {
      name: STORE_KEY,
      storage: createSafeJsonStorage(),
      partialize: (state) =>
        pickPersistedStoreState(state, ["availabilityByOwner", "personalEventsByOwner", "revisionsByOwner", "seeded"]),
    }
  )
);

/** 로그인 사용자 일정 ownerId (데모: me) */
export function getMyScheduleOwnerId() {
  return DEFAULT_OWNER;
}
