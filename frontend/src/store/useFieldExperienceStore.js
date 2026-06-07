import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createFieldExperienceRecord } from "../utils/fieldExperienceModel";

export const useFieldExperienceStore = create(
  persist(
    (set, get) => ({
      records: [],
      quickSaveExperience: (payload) => {
        const record = createFieldExperienceRecord(payload);
        set((state) => ({
          records: [record, ...(state.records || [])].slice(0, 300),
        }));
        return record;
      },
      getHubRecords: (hubKey) => {
        const records = get().records || [];
        return records.filter((record) => record.hubKey === hubKey);
      },
      clearExperiences: () => set({ records: [] }),
    }),
    {
      name: "ildangmap_field_experiences_v1",
      version: 1,
    }
  )
);
