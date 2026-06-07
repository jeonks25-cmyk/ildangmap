import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSafeJsonStorage, pickPersistedStoreState } from "./storeUtils";

const STORE_KEY = "ildangmap_work_timeline_v1";

function trimSnippet(text, max = 80) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

export const useWorkTimelineStore = create(
  persist(
    (set, get) => ({
      events: [],

      appendWorkEvent: (partial) =>
        set((state) => {
          const id = partial.id || `evt-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
          const at = partial.at || new Date().toISOString();
          const row = {
            id,
            at,
            kind: partial.kind || "note",
            title: String(partial.title || "").trim() || "기록",
            detail: String(partial.detail || "").trim(),
            siteKey: partial.siteKey != null ? String(partial.siteKey) : "",
          };
          const next = [row, ...(Array.isArray(state.events) ? state.events : [])].slice(0, 200);
          return { events: next };
        }),

      recordBriefingPostEvent: ({ siteKey, body }) =>
        get().appendWorkEvent({
          kind: "ops_feed",
          title: "운영 기록",
          detail: trimSnippet(body),
          siteKey: siteKey != null ? String(siteKey) : "",
        }),
    }),
    {
      name: STORE_KEY,
      storage: createSafeJsonStorage(),
      partialize: (state) => pickPersistedStoreState(state, ["events"]),
    }
  )
);
