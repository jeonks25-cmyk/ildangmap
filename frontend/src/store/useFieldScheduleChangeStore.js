import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useUiStore } from "./useUiStore";
import { createSafeJsonStorage, pickPersistedStoreState } from "./storeUtils";

const STORE_KEY = "ildangmap_field_schedule_change_v1";

/**
 * 현장 일정 변경 → 팀원 가능/불가 응답, 부족 인원 카운트 (MVP 목업).
 * 서버/웹소켓 없음.
 */
export const useFieldScheduleChangeStore = create(
  persist(
    (set, get) => ({
      /** notificationId -> 'available' | 'blocked' */
      availabilityByNotificationId: {},
      /** siteId -> 부족 인원 수 */
      shortageBySiteId: {},

      getResponse: (notificationId) => get().availabilityByNotificationId[notificationId] || null,

      getShortage: (siteId) => Math.max(0, Number(get().shortageBySiteId[siteId] || 0)),

      respondScheduleChange: ({ notificationId, siteId, available }) => {
        if (!notificationId) return;
        set((state) => {
          const availabilityByNotificationId = {
            ...state.availabilityByNotificationId,
            [notificationId]: available ? "available" : "blocked",
          };
          const shortageBySiteId = { ...state.shortageBySiteId };
          if (siteId) {
            const cur = Number(shortageBySiteId[siteId] || 0);
            if (!available) {
              shortageBySiteId[siteId] = cur + 1;
            } else if (cur > 0) {
              shortageBySiteId[siteId] = cur - 1;
            }
          }
          return { availabilityByNotificationId, shortageBySiteId };
        });
        useUiStore.getState().showAppToast(available ? "참여 가능으로 응답했습니다" : "불가로 응답 · 인원에서 제외됩니다");
      },

      recruitReplacement: (siteId) => {
        void siteId;
        useUiStore.getState().showAppToast("대체 인원 연결은 다음 단계에서 연결됩니다");
      },
    }),
    {
      name: STORE_KEY,
      storage: createSafeJsonStorage(),
      partialize: (state) =>
        pickPersistedStoreState(state, ["availabilityByNotificationId", "shortageBySiteId"]),
    }
  )
);
