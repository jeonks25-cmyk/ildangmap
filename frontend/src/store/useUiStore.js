import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSafeJsonStorage, pickPersistedStoreState } from "./storeUtils";

const STORE_KEY = "ildangmap_ui_store_v1";

function createInitialState() {
  return {
    currentTab: "/map",
    authPromptOpen: false,
    authPromptReason: "",
    appToastMessage: "",
    appToastAt: 0,
    activeBottomSheet: "",
    bottomSheetPayload: null,
    bottomSheetVh: 0,
    mapZoomFar: false,
    mapLevel: 7,
    selectedCardId: "",
    notificationOpen: false,
    notificationView: "center",
    notificationReadIds: [],
    notificationSettings: {
      attendance: true,
      schedule: true,
      site: true,
      message: true,
      team: true,
    },
  };
}

export const useUiStore = create(
  persist(
    (set) => ({
      ...createInitialState(),

      setCurrentTab: (currentTab) =>
        set(() => ({
          currentTab: currentTab || "/map",
        })),

      openAuthPrompt: (reason = "") =>
        set(() => ({
          authPromptOpen: true,
          authPromptReason: typeof reason === "string" && reason.trim() ? reason.trim() : "default",
        })),

      closeAuthPrompt: () =>
        set(() => ({
          authPromptOpen: false,
          authPromptReason: "",
        })),

      showAppToast: (message) =>
        set(() => ({
          appToastMessage: String(message || "").trim() || "문제가 발생했어요.",
          appToastAt: Date.now(),
        })),

      clearAppToast: () =>
        set(() => ({
          appToastMessage: "",
          appToastAt: 0,
        })),

      openBottomSheet: (activeBottomSheet, bottomSheetPayload = null) =>
        set(() => ({
          activeBottomSheet: activeBottomSheet || "",
          bottomSheetPayload: bottomSheetPayload ?? null,
        })),

      closeBottomSheet: () =>
        set(() => ({
          activeBottomSheet: "",
          bottomSheetPayload: null,
        })),

      setBottomSheetVh: (bottomSheetVh) =>
        set(() => ({
          bottomSheetVh: Number.isFinite(Number(bottomSheetVh)) ? Number(bottomSheetVh) : 0,
        })),

      setMapZoomFar: (mapZoomFar) =>
        set(() => ({
          mapZoomFar: Boolean(mapZoomFar),
        })),

      setMapLevel: (mapLevel) =>
        set(() => ({
          mapLevel: Number.isFinite(Number(mapLevel)) ? Number(mapLevel) : 7,
        })),

      setSelectedCardId: (selectedCardId) =>
        set(() => ({
          selectedCardId: selectedCardId || "",
        })),

      openNotificationCenter: () =>
        set(() => ({
          notificationOpen: true,
          notificationView: "center",
        })),

      closeNotificationCenter: () =>
        set(() => ({
          notificationOpen: false,
          notificationView: "center",
        })),

      openNotificationSettings: () =>
        set(() => ({
          notificationOpen: true,
          notificationView: "settings",
        })),

      backToNotificationCenter: () =>
        set(() => ({
          notificationView: "center",
        })),

      toggleNotificationRead: (notificationId) =>
        set((state) => {
          if (!notificationId) return state;
          const hasRead = state.notificationReadIds.includes(notificationId);
          return {
            notificationReadIds: hasRead
              ? state.notificationReadIds.filter((id) => id !== notificationId)
              : [...state.notificationReadIds, notificationId],
          };
        }),

      markAllNotificationsRead: (notificationIds) =>
        set((state) => ({
          notificationReadIds: [
            ...new Set([
              ...state.notificationReadIds,
              ...((Array.isArray(notificationIds) ? notificationIds : []).filter(Boolean)),
            ]),
          ],
        })),

      toggleNotificationSetting: (type) =>
        set((state) => {
          if (!type) return state;
          return {
            notificationSettings: {
              ...state.notificationSettings,
              [type]: !(state.notificationSettings[type] !== false),
            },
          };
        }),
    }),
    {
      name: STORE_KEY,
      storage: createSafeJsonStorage(),
      partialize: (state) =>
        pickPersistedStoreState(state, [
          "currentTab",
          "bottomSheetVh",
          "mapZoomFar",
          "selectedCardId",
          "notificationReadIds",
          "notificationSettings",
        ]),
    }
  )
);
