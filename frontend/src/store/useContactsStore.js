import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FIELD_CONTACTS_MOCK, normalizeFieldContact } from "../utils/fieldContactsMock";
import { createSafeJsonStorage, pickPersistedStoreState } from "./storeUtils";
import { applyCoworkFromEndedSchedules, deriveCoworkStats, listCoworkHistoryForContact } from "../utils/coworkHistoryModel";
import { formatRegionsLabel, normalizeActivityRegions } from "../constants/activityRegions";

const STORE_KEY = "ildangmap_contacts_store_v1";

function applyContactOverride(raw, overrides = {}) {
  if (!overrides || typeof overrides !== "object") return raw;
  const next = { ...raw, ...overrides, id: raw.id };
  if (overrides.regions != null || overrides.homeRegion != null || overrides.region != null) {
    const nextRegions = normalizeActivityRegions(
      overrides.regions ?? overrides.homeRegion ?? overrides.region ?? raw.regions ?? raw.homeRegion ?? raw.region
    );
    next.regions = nextRegions;
    next.homeRegion = formatRegionsLabel(nextRegions);
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

export const useContactsStore = create(
  persist(
    (set, get) => ({
      favoriteById: {},
      memoById: {},
      /** mock 연락처 편집 오버레이 */
      contactOverridesById: {},
      /** mock 연락처 삭제(숨김) */
      removedContactIds: [],

      // 사용자 정의 그룹(인력 운영 보드). 공정 하드코딩 없음 — 모두 사용자 생성.
      groups: [], // { id, name, sortOrder, createdAt, tradeHint? }
      memberIdsByGroup: {}, // { [groupId]: contactId[] } — 멤버십 단일 소스 (M:N)

      /** 협업 현장 이력 — 단일 소스. count/lastWorkedAt/최근 현장은 여기서 파생 */
      coworkHistory: [], // CoworkHistoryEntry[]
      /** 종료 현장 1회만 처리하기 위한 목록 */
      coworkProcessedScheduleIds: [],

      // 사용자가 직접 추가한 사람(수동 입력 + 일당맵 가입자). 기존 목 위에 합쳐 표시.
      addedContacts: [], // { id, name, phone, trade, homeRegion, birthYear, userId, source, createdAt }

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
      },

      setMemo: (contactId, memo) => {
        const id = String(contactId);
        set((state) => ({
          memoById: { ...state.memoById, [id]: String(memo || "").trim() },
        }));
      },

      /**
       * 사람 직접 추가(수동 입력 또는 일당맵 가입자). 그룹 자동 배정 없음 — 전체 탭에만 표시.
       * @returns {string|null} 생성된 contact id
       */
      addContact: (data = {}) => {
        const name = String(data.name || "").trim();
        if (!name) return null;
        const id = `u-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
        const regions = normalizeActivityRegions(data.regions ?? data.homeRegion ?? data.region);
        const record = {
          id,
          name,
          phone: String(data.phone || "").trim(),
          trade: String(data.trade || "").trim(),
          regions,
          homeRegion: formatRegionsLabel(regions),
          birthYear: Number.isFinite(Number(data.birthYear)) ? Number(data.birthYear) : null,
          userId: Number.isFinite(Number(data.userId)) ? Number(data.userId) : null,
          source: data.source === "appuser" ? "appuser" : "manual",
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ addedContacts: [...state.addedContacts, record] }));
        return id;
      },

      updateContact: (contactId, patch = {}) => {
        get().updateContactFields(contactId, patch);
      },

      /** mock·추가 연락처 공통 필드 수정 */
      updateContactFields: (contactId, patch = {}) => {
        const id = String(contactId);
        if (!id) return;
        const clean = { ...patch };
        if (clean.regions != null || clean.homeRegion != null || clean.region != null) {
          const nextRegions = normalizeActivityRegions(clean.regions ?? clean.homeRegion ?? clean.region);
          clean.regions = nextRegions;
          clean.homeRegion = formatRegionsLabel(nextRegions);
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
      },

      /**
       * 초대 → 가입 → 자동 연결.
       * addedContacts에서 contactId 또는 동일 전화번호로 미가입자(source:"manual")를 찾아
       * source:"appuser" + linkedUserId 로 전환하고, groupId 있으면 그룹에 자동 배정한다.
       * @returns {string|null} 전환된 contact id
       */
      linkInvitedContact: ({ contactId, phone, groupId, joinedUserId, joinedName, joinedResidence } = {}) => {
        const targetId = contactId != null ? String(contactId) : null;
        const phoneDigits = String(phone || "").replace(/[^\d]/g, "");
        const list = get().addedContacts;

        const match =
          (targetId && list.find((c) => c.id === targetId)) ||
          (phoneDigits &&
            list.find(
              (c) => c.source === "manual" && String(c.phone || "").replace(/[^\d]/g, "") === phoneDigits
            )) ||
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
      },

      /** 새 그룹 생성 → 생성된 groupId 반환(없으면 null) */
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
        return id;
      },

      renameGroup: (groupId, name) => {
        const clean = String(name || "").trim();
        if (!groupId || !clean) return;
        set((state) => ({
          groups: state.groups.map((g) => (g.id === groupId ? { ...g, name: clean } : g)),
        }));
      },

      /** 그룹 공정 힌트(선택). null/빈값이면 힌트 제거 — 공정 강제 아님 */
      setGroupTradeHint: (groupId, tradeHint) => {
        if (!groupId) return;
        const next = tradeHint ? String(tradeHint).trim() : null;
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId ? { ...g, tradeHint: next || undefined } : g
          ),
        }));
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
      },

      getCoworkStats: (contactId) => deriveCoworkStats(contactId, get().coworkHistory),

      getCoworkHistoryForContact: (contactId, limit = null) =>
        listCoworkHistoryForContact(contactId, get().coworkHistory, limit),

      /** 종료된 현장 일정에서 accepted 참석자 협업 이력 기록 */
      syncCoworkFromSchedules: (schedules) => {
        const contacts = get().getContacts();
        let processedIds = get().coworkProcessedScheduleIds;
        const history = get().coworkHistory;
        // stats-only 버전 업그레이드: history 없이 processed만 있으면 재처리해 현장명 포함 이력 생성
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
        return result.newlyProcessedCount;
      },
    }),
    {
      name: STORE_KEY,
      storage: createSafeJsonStorage(),
      partialize: (state) =>
        pickPersistedStoreState(state, [
          "favoriteById",
          "memoById",
          "contactOverridesById",
          "removedContactIds",
          "groups",
          "memberIdsByGroup",
          "addedContacts",
          "coworkHistory",
          "coworkProcessedScheduleIds",
        ]),
    }
  )
);
