import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  getScheduleColorDisplayLabel,
  normalizeScheduleColorId,
} from "../constants/scheduleColors";

export const useScheduleColorAliasStore = create(
  persist(
    (set, get) => ({
      aliasesByColorId: {},

      setColorAlias: (colorId, alias) => {
        try {
          const id = normalizeScheduleColorId(colorId);
          const trimmed = String(alias || "").trim();
          set((state) => {
            const next = { ...state.aliasesByColorId };
            if (!trimmed) delete next[id];
            else next[id] = trimmed;
            return { aliasesByColorId: next };
          });
        } catch (error) {
          console.error("[ScheduleColorAlias] setColorAlias failed", error);
        }
      },

      getColorAlias: (colorId) => {
        const id = normalizeScheduleColorId(colorId);
        return String(get().aliasesByColorId[id] || "").trim();
      },

      getDisplayLabel: (colorId) => getScheduleColorDisplayLabel(colorId, get().aliasesByColorId),
    }),
    { name: "ildangmap_schedule_color_aliases_v1" }
  )
);
