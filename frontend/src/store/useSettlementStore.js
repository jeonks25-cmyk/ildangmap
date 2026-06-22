import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getBriefingFilters, getBriefings } from "../api/briefingApi";
import { getSchedules as getSchedulesApi, getSettlementSummary as getSettlementSummaryApi } from "../api/settlementApi";
import {
  applyFieldOpsToLegacyStorage,
  getSchedulesData,
  hasSchedulesPayload,
  normalizeSchedulesPayload,
  putSchedulesData,
  readLegacySchedulesLocalStorage,
  removeLegacySchedulesLocalStorage,
} from "../api/schedulesApi";
import { getApiErrorMessage, isNetworkError } from "../api/client";
import {
  createScheduleFromJobMatch,
  migrateSchedule,
} from "../utils/scheduleModel";
import {
  appendScheduleInvites,
  findPendingInviteByScheduleUser,
  markInviteAccepted,
  markInviteDeclined,
} from "../utils/scheduleInviteInbox";
import { readAllFieldOps } from "../utils/scheduleFieldOpsStorage";
import { mergeWorkerAssignmentsForInvite, syncScheduleParticipantSelection } from "../utils/workerAssignmentModel";
import { createSafeJsonStorage, pickPersistedStoreState, resolveUpdater, runAsyncStoreAction } from "./storeUtils";
import { useContactsStore } from "./useContactsStore";
import {
  emitScheduleCancelledNotification,
  emitScheduleCreatedNotification,
} from "./useNotificationStore";
import { createScheduleBriefingId, ensureScheduleBriefingIdValue } from "../utils/scheduleBoardAccess";
import { useUserStore } from "./useUserStore";

const STORE_KEY = "ildangmap_settlement_store_v2";

let schedulesSyncTimer = null;
let schedulesBootstrapInFlight = null;
let schedulesSyncPaused = false;

function normalizeSchedules(scheduleList) {
  return (Array.isArray(scheduleList) ? scheduleList : []).map((schedule) => migrateSchedule(schedule)).filter(Boolean);
}

function scheduleSyncDebouncedImpl() {
  const state = useSettlementStore.getState();
  if (schedulesSyncPaused || !state.schedulesUserId || !state.schedulesLoaded) return;
  if (schedulesSyncTimer) clearTimeout(schedulesSyncTimer);
  schedulesSyncTimer = setTimeout(() => {
    schedulesSyncTimer = null;
    useSettlementStore.getState().syncSchedulesToServer().catch(() => {
      /* schedulesError in store */
    });
  }, 600);
}

function payloadFromState(state) {
  return normalizeSchedulesPayload({
    schedules: state.schedules,
    fieldOps: readAllFieldOps(),
  });
}

function applyPayloadToSet(set, payload, briefingData = []) {
  schedulesSyncPaused = true;
  const normalized = normalizeSchedulesPayload(payload);
  applyFieldOpsToLegacyStorage(normalized.fieldOps);
  set({
    schedules: normalized.schedules,
    summary: buildLocalSummary(normalized.schedules, briefingData),
  });
  schedulesSyncPaused = false;
}

function createDefaultSummary() {
  return {
    monthExpected: 0,
    settledAmount: 0,
    unpaidAmount: 0,
    scheduledAmount: 0,
    briefingData: [],
  };
}

function buildLocalSummary(scheduleList, briefingData = [], today = new Date()) {
  const currentMonthSchedules = (Array.isArray(scheduleList) ? scheduleList : []).filter((schedule) => {
    if (!schedule?.workDate) return false;
    const date = new Date(schedule.workDate);
    return !Number.isNaN(date.getTime()) && date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
  });
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let monthExpected = 0;
  let settledAmount = 0;
  let unpaidAmount = 0;
  let scheduledAmount = 0;

  currentMonthSchedules.forEach((schedule) => {
    const amount = Number(schedule?.settlementAmount || 0);
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    const workDate = new Date(schedule?.workDate);
    monthExpected += safeAmount;
    if (schedule?.settlementStatus === "settled") {
      settledAmount += safeAmount;
      return;
    }
    if (!Number.isNaN(workDate.getTime()) && workDate >= todayStart && schedule?.settlementStatus !== "review") {
      scheduledAmount += safeAmount;
      return;
    }
    unpaidAmount += safeAmount;
  });

  return {
    monthExpected,
    settledAmount,
    unpaidAmount,
    scheduledAmount,
    briefingData,
  };
}

function createInitialState() {
  return {
    schedules: [],
    summary: buildLocalSummary([], []),
    briefingData: [],
    briefingFilters: [],
    loading: false,
    error: "",
    briefingLoading: false,
    briefingError: "",
    schedulesLoaded: false,
    briefingsLoaded: false,
    schedulesUserId: null,
    schedulesSyncing: false,
    schedulesError: "",
  };
}

export const useSettlementStore = create(
  persist(
    (set, get) => ({
      ...createInitialState(),

      scheduleSyncDebounced: scheduleSyncDebouncedImpl,

      buildSchedulesPayload: () => payloadFromState(get()),

      applySchedulesPayload: (payload) => {
        applyPayloadToSet(set, payload, get().briefingData);
      },

      resetSchedules: () => {
        if (schedulesSyncTimer) {
          clearTimeout(schedulesSyncTimer);
          schedulesSyncTimer = null;
        }
        set({
          schedules: [],
          summary: buildLocalSummary([], get().briefingData),
          schedulesUserId: null,
          schedulesLoaded: false,
          schedulesSyncing: false,
          schedulesError: "",
        });
      },

      syncSchedulesToServer: async () => {
        const userId = get().schedulesUserId;
        if (!userId || !get().schedulesLoaded) return null;
        set({ schedulesSyncing: true, schedulesError: "" });
        try {
          const saved = await putSchedulesData(get().buildSchedulesPayload());
          applyPayloadToSet(set, saved, get().briefingData);
          return saved;
        } catch (error) {
          set({ schedulesError: getApiErrorMessage(error, "일정을 저장하지 못했습니다.") });
          throw error;
        } finally {
          set({ schedulesSyncing: false });
        }
      },

      bootstrapSchedules: async (userId) => {
        const uid = userId != null && userId !== "" ? String(userId) : null;
        if (!uid) {
          get().resetSchedules();
          return;
        }
        if (get().schedulesUserId && get().schedulesUserId !== uid) {
          get().resetSchedules();
        }
        if (get().schedulesLoaded && get().schedulesUserId === uid) return;

        if (schedulesBootstrapInFlight) return schedulesBootstrapInFlight;

        const run = (async () => {
          set({ loading: true, schedulesError: "" });
          try {
            const server = normalizeSchedulesPayload(await getSchedulesData());
            if (hasSchedulesPayload(server)) {
              get().applySchedulesPayload(server);
              set({ schedulesUserId: uid, schedulesLoaded: true });
              return;
            }

            const legacy = readLegacySchedulesLocalStorage();
            if (hasSchedulesPayload(legacy)) {
              get().applySchedulesPayload(legacy);
              const saved = normalizeSchedulesPayload(await putSchedulesData(get().buildSchedulesPayload()));
              get().applySchedulesPayload(saved);
              removeLegacySchedulesLocalStorage();
              set({ schedulesUserId: uid, schedulesLoaded: true });
              return;
            }

            get().applySchedulesPayload(normalizeSchedulesPayload({ schedules: [], fieldOps: readAllFieldOps() }));
            set({ schedulesUserId: uid, schedulesLoaded: true });
          } catch (error) {
            const legacy = readLegacySchedulesLocalStorage();
            if (hasSchedulesPayload(legacy)) {
              get().applySchedulesPayload(legacy);
              set({
                schedulesUserId: uid,
                schedulesLoaded: true,
                schedulesError: getApiErrorMessage(error, "일정을 불러오지 못했습니다. 오프라인 데이터를 표시합니다."),
              });
              return;
            }
            set({
              schedulesError: getApiErrorMessage(error, "일정을 불러오지 못했습니다."),
              schedulesUserId: uid,
              schedulesLoaded: true,
            });
          } finally {
            set({ loading: false });
          }
        })();

        schedulesBootstrapInFlight = run;
        try {
          await run;
        } finally {
          schedulesBootstrapInFlight = null;
        }
      },

      setSchedules: (nextSchedules) =>
        set((state) => {
          const schedules = normalizeSchedules(resolveUpdater(state.schedules, nextSchedules));
          return {
            schedules,
            summary: buildLocalSummary(schedules, state.briefingData),
          };
        }),

      addSchedule: (schedule) => {
        const viewerId = useUserStore.getState().session?.user?.id ?? useUserStore.getState().profile?.applicantUserId;
        const next = migrateSchedule({
          ...schedule,
          briefingId: ensureScheduleBriefingIdValue(schedule),
          createdByUserId:
            schedule?.createdByUserId ??
            (Number.isFinite(Number(viewerId)) && Number(viewerId) > 0 ? Number(viewerId) : null),
        });
        set((state) => {
          const schedules = [next, ...(Array.isArray(state.schedules) ? state.schedules : [])];
          return {
            schedules,
            summary: buildLocalSummary(schedules, state.briefingData),
          };
        });
        emitScheduleCreatedNotification({ schedule: next });
        return next;
      },

      addScheduleFromJobMatch: (job, overrides = {}) => {
        const viewerId = useUserStore.getState().session?.user?.id ?? useUserStore.getState().profile?.applicantUserId;
        const schedule = migrateSchedule({
          ...createScheduleFromJobMatch(job, overrides),
          briefingId: createScheduleBriefingId(),
          createdByUserId:
            overrides.createdByUserId ??
            (Number.isFinite(Number(viewerId)) && Number(viewerId) > 0 ? Number(viewerId) : null),
        });
        set((state) => {
          const schedules = [schedule, ...(Array.isArray(state.schedules) ? state.schedules : [])];
          return {
            schedules,
            summary: buildLocalSummary(schedules, state.briefingData),
          };
        });
        emitScheduleCreatedNotification({ schedule });
        return schedule;
      },

      updateSchedule: (scheduleId, patchOrUpdater) => {
        if (scheduleId == null) return null;
        let updated = null;
        set((state) => {
          const schedules = (Array.isArray(state.schedules) ? state.schedules : []).map((schedule) => {
            if (!schedule || String(schedule.id) !== String(scheduleId)) return schedule;
            const patch =
              typeof patchOrUpdater === "function" ? patchOrUpdater(schedule) : patchOrUpdater;
            updated = migrateSchedule({
              ...schedule,
              ...(patch || {}),
              updatedAt: new Date().toISOString(),
            });
            return updated;
          });
          return {
            schedules,
            summary: buildLocalSummary(schedules, state.briefingData),
          };
        });
        return updated;
      },

      deleteSchedule: (scheduleId) => {
        if (scheduleId == null) return false;
        let removedSchedule = null;
        let removed = false;
        set((state) => {
          const schedules = (Array.isArray(state.schedules) ? state.schedules : []).filter((schedule) => {
            if (!schedule || String(schedule.id) !== String(scheduleId)) return true;
            removedSchedule = schedule;
            removed = true;
            return false;
          });
          return {
            schedules,
            summary: buildLocalSummary(schedules, state.briefingData),
          };
        });
        if (removed && removedSchedule) {
          emitScheduleCancelledNotification({ schedule: removedSchedule });
        }
        return removed;
      },

      createSharedFieldSchedule: (payload) => {
        const briefingId =
          typeof window !== "undefined" && window.crypto && typeof window.crypto.randomUUID === "function"
            ? window.crypto.randomUUID()
            : `br-${Date.now()}`;
        const invitees = Array.isArray(payload.invitees) ? payload.invitees : [];
        const schedule = migrateSchedule({
          id: `sched-share-${Date.now()}`,
          jobId: null,
          briefingId,
          workDate: String(payload.workDate || "").trim(),
          title: String(payload.title || "").trim() || "현장 일정",
          fullAddress: String(payload.fullAddress || "").trim(),
          shortRegion: String(payload.shortRegion || "").trim() || String(payload.fullAddress || "").trim().slice(0, 24),
          workTime: String(payload.workTime || "08:00~17:00").trim(),
          workDetails: String(payload.workDetails || "").trim(),
          entryInfo: String(payload.entryInfo || "").trim(),
          parkingInfo: String(payload.parkingInfo || "").trim(),
          requiredItems: String(payload.requiredItems || "").trim(),
          specialNote: String(payload.specialNote || "").trim(),
          materialNote: String(payload.materialNote || "").trim(),
          parkingNote: String(payload.parkingInfo || "").trim(),
          accessPassword: String(payload.entryInfo || "").trim(),
          summaryLines: [String(payload.workDetails || "").trim()].filter(Boolean),
          source: "calendar-share",
          sourceJobMatchReady: false,
          scheduleKind: "shared",
          createdByUserId: Number(payload.createdByUserId),
          scheduleInvites: invitees.map((x) => ({
            userId: Number(x.userId),
            name: String(x.name || "").trim() || "기술자",
            status: "pending",
          })),
          lat: Number.isFinite(Number(payload.lat)) ? Number(payload.lat) : 36.3504,
          lng: Number.isFinite(Number(payload.lng)) ? Number(payload.lng) : 127.3845,
          crewCount: (() => {
            const n = Number(payload.crewCount);
            const base = Math.max(1, 1 + invitees.length);
            if (Number.isFinite(n) && n >= base) return n;
            return base;
          })(),
          settledWorkerCount: 0,
          settlementStatus: "waiting",
          canRecruitUrgent: false,
          status: "confirmed",
        });
        set((state) => {
          const schedules = [schedule, ...(Array.isArray(state.schedules) ? state.schedules : [])];
          return {
            schedules,
            summary: buildLocalSummary(schedules, state.briefingData),
          };
        });
        appendScheduleInvites({
          scheduleId: schedule.id,
          briefingId,
          fromUserId: Number(payload.createdByUserId),
          fromName: String(payload.fromName || "").trim(),
          title: schedule.title,
          workDate: schedule.workDate,
          invitees,
        });
        emitScheduleCreatedNotification({ schedule, actorName: payload.fromName });
        return schedule;
      },

      acceptScheduleInvite: (inviteId) => {
        const inv = markInviteAccepted(inviteId);
        if (!inv || inv.status !== "accepted") return null;
        let created = null;
        set((state) => {
          const list = Array.isArray(state.schedules) ? state.schedules : [];
          const origin = list.find((s) => s && s.id === inv.scheduleId);
          if (!origin) return {};
          const copy = migrateSchedule({
            ...origin,
            id: `sched-join-${Date.now()}`,
            joinedFromScheduleId: origin.id,
            acceptedParticipantUserId: inv.toUserId,
            scheduleInvites: [],
            source: "calendar-share-joined",
            scheduleKind: "shared",
          });
          created = copy;
          const schedules = [copy, ...list];
          return {
            schedules,
            summary: buildLocalSummary(schedules, state.briefingData),
          };
        });
        return created;
      },

      /**
       * composer 참여자 선택과 scheduleInvites·workerAssignments를 동기화한다.
       * - 체크 해제한 참여자는 scheduleInvites·workerAssignments에서 제거 (owner 유지)
       * - 새로 추가된 초대만 scheduleInviteInbox에 기록
       */
      syncScheduleParticipants: ({ scheduleId, fromUserId, fromName, invitees }) => {
        if (scheduleId == null) return { added: 0, removed: 0 };
        const list = Array.isArray(get().schedules) ? get().schedules : [];
        const origin = list.find((s) => s && String(s.id) === String(scheduleId));
        if (!origin) return { added: 0, removed: 0 };

        const existing = Array.isArray(origin.scheduleInvites) ? origin.scheduleInvites : [];
        const existingUserIds = new Set(existing.map((x) => Number(x.userId)).filter(Number.isFinite));
        const { scheduleInvites, workerAssignments } = syncScheduleParticipantSelection(origin, invitees);
        get().updateSchedule(scheduleId, { scheduleInvites, workerAssignments });

        const nextUserIds = new Set(scheduleInvites.map((iv) => Number(iv.userId)));
        const removed = [...existingUserIds].filter((uid) => !nextUserIds.has(uid)).length;
        const toAdd = (Array.isArray(invitees) ? invitees : []).filter(
          (iv) => iv && Number.isFinite(Number(iv.userId)) && !existingUserIds.has(Number(iv.userId))
        );
        if (toAdd.length) {
          appendScheduleInvites({
            scheduleId: String(scheduleId),
            briefingId: origin.briefingId || "",
            fromUserId: Number(fromUserId) || 0,
            fromName: String(fromName || "").trim(),
            title: origin.title,
            workDate: origin.workDate,
            invitees: toAdd.map((iv) => ({ userId: Number(iv.userId), name: iv.name })),
          });
        }
        return { added: toAdd.length, removed };
      },

      /**
       * 기존 현장 일정에 연락처(기술자)를 구조화 초대로 추가한다.
       * - schedule.scheduleInvites 에 status:"pending" 으로 병합(현장 상세 팀원 탭 = 대기 반영)
       * - scheduleInviteInbox 에도 기록(알림 카드/수락 재사용용)
       * @returns {number} 새로 추가된 초대 수
       */
      inviteContactsToSchedule: ({ scheduleId, fromUserId, fromName, invitees }) => {
        if (scheduleId == null) return 0;
        const list = Array.isArray(get().schedules) ? get().schedules : [];
        const origin = list.find((s) => s && String(s.id) === String(scheduleId));
        if (!origin) return 0;
        const existing = Array.isArray(origin.scheduleInvites) ? origin.scheduleInvites : [];
        const existingIds = new Set(existing.map((x) => Number(x.userId)));
        const toAdd = (Array.isArray(invitees) ? invitees : []).filter(
          (iv) => iv && Number.isFinite(Number(iv.userId)) && !existingIds.has(Number(iv.userId))
        );
        if (!toAdd.length) return 0;
        const mergedInvites = [
          ...existing,
          ...toAdd.map((iv) => ({
            userId: Number(iv.userId),
            name: String(iv.name || "").trim() || "기술자",
            birthYear: Number.isFinite(Number(iv.birthYear)) ? Number(iv.birthYear) : null,
            residence: String(iv.residence || "").trim(),
            status: "pending",
          })),
        ];
        const workerAssignments = mergeWorkerAssignmentsForInvite(origin, toAdd);
        get().updateSchedule(scheduleId, { scheduleInvites: mergedInvites, workerAssignments });
        appendScheduleInvites({
          scheduleId: String(scheduleId),
          briefingId: origin.briefingId || "",
          fromUserId: Number(fromUserId) || 0,
          fromName: String(fromName || "").trim(),
          title: origin.title,
          workDate: origin.workDate,
          invitees: toAdd.map((iv) => ({ userId: Number(iv.userId), name: iv.name })),
        });
        return toAdd.length;
      },

      /**
       * 초대받은 사용자의 참석/불가 응답.
       * - 참석: 기존 acceptScheduleInvite() 재사용 → 수신자 일정 자동 등록
       * - 불가: 인박스 declined 처리
       * - 원본 일정의 scheduleInvites 상태도 accepted/declined 로 반영(팀원 탭 표시)
       */
      respondScheduleInvite: ({ scheduleId, userId, available }) => {
        const uid = Number(userId);
        const inbox = findPendingInviteByScheduleUser(scheduleId, uid);
        if (available) {
          if (inbox) get().acceptScheduleInvite(inbox.id);
        } else if (inbox) {
          markInviteDeclined(inbox.id);
        }
        get().updateSchedule(scheduleId, (schedule) => {
          const invs = Array.isArray(schedule.scheduleInvites) ? schedule.scheduleInvites : [];
          return {
            scheduleInvites: invs.map((iv) =>
              Number(iv.userId) === uid ? { ...iv, status: available ? "accepted" : "declined" } : iv
            ),
          };
        });
        return available ? "accepted" : "declined";
      },

      refreshSettlementData: async ({ force = false } = {}) => {
        if (get().schedulesLoaded && get().schedulesUserId) {
          const summary = await getSettlementSummaryApi(get().schedules);
          set((state) => ({
            summary: {
              ...createDefaultSummary(),
              ...summary,
              briefingData: state.briefingData,
            },
          }));
          return get().schedules;
        }
        if (!force && get().schedulesLoaded) return get().schedules;
        return runAsyncStoreAction({
          set,
          defaultErrorMessage: "정산 데이터를 불러오지 못했습니다.",
          action: async () => {
            const schedules = normalizeSchedules(await getSchedulesApi());
            const summary = await getSettlementSummaryApi(schedules);
            return { schedules, summary };
          },
          onSuccess: (state, payload) => ({
            schedules: payload.schedules,
            summary: {
              ...createDefaultSummary(),
              ...payload.summary,
              briefingData: state.briefingData,
            },
            schedulesLoaded: true,
          }),
          onError: (state, error) => {
            if (!isNetworkError(error)) return {};
            const fallbackSchedules = Array.isArray(state.schedules) ? state.schedules : [];
            return {
              schedules: fallbackSchedules,
              schedulesLoaded: true,
              summary: {
                ...createDefaultSummary(),
                ...buildLocalSummary(fallbackSchedules, state.briefingData),
              },
            };
          },
        }).then((payload) => payload.schedules);
      },

      refreshSettlementSummary: async () => {
        const schedules = get().schedules;
        const summary = await getSettlementSummaryApi(schedules);
        set((state) => ({
          summary: {
            ...createDefaultSummary(),
            ...summary,
            briefingData: state.briefingData,
          },
        }));
        return summary;
      },

      refreshBriefings: async ({ force = false } = {}) => {
        if (!force && get().briefingsLoaded) {
          return {
            briefingData: get().briefingData,
            briefingFilters: get().briefingFilters,
          };
        }
        return runAsyncStoreAction({
          set,
          loadingKey: "briefingLoading",
          errorKey: "briefingError",
          defaultErrorMessage: "브리핑 데이터를 불러오지 못했습니다.",
          action: async () => {
            const [briefingData, briefingFilters] = await Promise.all([getBriefings(), getBriefingFilters()]);
            return {
              briefingData: Array.isArray(briefingData) ? briefingData : [],
              briefingFilters: Array.isArray(briefingFilters) ? briefingFilters : [],
            };
          },
          onSuccess: (state, payload) => ({
            ...payload,
            briefingsLoaded: true,
            summary: {
              ...state.summary,
              briefingData: payload.briefingData,
            },
          }),
          onError: (state, error) => {
            if (!isNetworkError(error)) return {};
            return {
              briefingsLoaded: true,
              briefingData: Array.isArray(state.briefingData) ? state.briefingData : [],
              briefingFilters: Array.isArray(state.briefingFilters) ? state.briefingFilters : [],
            };
          },
        });
      },

      setBriefingData: (briefingData) =>
        set((state) => ({
          briefingData: Array.isArray(briefingData) ? briefingData : state.briefingData,
          summary: {
            ...state.summary,
            briefingData: Array.isArray(briefingData) ? briefingData : state.briefingData,
          },
          briefingsLoaded: true,
        })),
    }),
    {
      name: STORE_KEY,
      storage: createSafeJsonStorage(),
      partialize: (state) =>
        pickPersistedStoreState(state, [
          "briefingData",
          "briefingFilters",
          "summary",
          "briefingsLoaded",
        ]),
    }
  )
);

useSettlementStore.subscribe((state, prevState) => {
  if (state.schedules !== prevState?.schedules) {
    useContactsStore.getState().syncCoworkFromSchedules(state.schedules);
    scheduleSyncDebouncedImpl();
  }
});
useContactsStore.getState().syncCoworkFromSchedules(useSettlementStore.getState().schedules);
