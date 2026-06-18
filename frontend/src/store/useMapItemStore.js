import { create } from "zustand";
import { persist } from "zustand/middleware";
import { normalizeMapItemDraft } from "../utils/mapItemDraft";
import { createSafeJsonStorage, resolveUpdater } from "./storeUtils";

const STORE_KEY = "ildangmap_map_item_store_v1";

export const useMapItemStore = create(
  persist(
    (set, get) => ({
      items: [],
      addMapItemDraft: (payload) => {
        const item = normalizeMapItemDraft(payload);
        set((state) => ({
          items: [item, ...(Array.isArray(state.items) ? state.items : [])],
        }));
        return item;
      },
      updateMapItem: (id, patch = {}) => {
        let updated = null;
        set((state) => ({
          items: (Array.isArray(state.items) ? state.items : []).map((item) => {
            if (String(item.id) !== String(id)) return item;
            const next = normalizeMapItemDraft({
              ...item,
              ...patch,
              id: item.id,
              sourceMeta: {
                ...(item.sourceMeta || {}),
                ...(patch.sourceMeta || {}),
                updatedAt: new Date().toISOString(),
              },
            });
            updated = next;
            return next;
          }),
        }));
        return updated;
      },
      setItems: (nextItems) =>
        set((state) => {
          const resolved = resolveUpdater(state.items, nextItems);
          return {
            items: (Array.isArray(resolved) ? resolved : []).map((item) => normalizeMapItemDraft(item)),
          };
        }),
      updateItemsForScheduleMove: ({ scheduleId, fieldId, nextDateKey } = {}) => {
        if (!nextDateKey) return [];
        const updated = [];
        set((state) => ({
          items: (Array.isArray(state.items) ? state.items : []).map((item) => {
            const source = item?.source || {};
            const related =
              (scheduleId && String(source.relatedScheduleId || item?.relatedScheduleId || "") === String(scheduleId)) ||
              (fieldId != null && String(item?.relatedFieldId || source.relatedFieldId || "") === String(fieldId));
            if (!related) return item;
            const next = normalizeMapItemDraft({
              ...item,
              scheduleDate: nextDateKey,
              source: {
                ...source,
                relatedScheduleId: scheduleId || source.relatedScheduleId,
                movedWithScheduleAt: new Date().toISOString(),
              },
            });
            updated.push(next);
            return next;
          }),
        }));
        return updated;
      },
      listByScheduleDate: (dateKey) =>
        (Array.isArray(get().items) ? get().items : []).filter((item) => item?.scheduleDate === dateKey),
      clearMapItems: () => set(() => ({ items: [] })),
    }),
    {
      name: STORE_KEY,
      version: 1,
      storage: createSafeJsonStorage(),
      partialize: (state) => ({ items: state.items }),
    }
  )
);
