import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createFieldCheckInRecord } from "../utils/fieldCheckInModel";
import { getExperienceHubKey } from "../utils/fieldExperienceModel";
import { emitCheckInNotification, emitCheckOutNotification } from "./useNotificationStore";
import { buildBriefingAuthorFromViewer } from "../utils/briefingAuthor";

export const useFieldCheckInStore = create(
  persist(
    (set, get) => ({
      records: [],
      checkIn: (payload) => {
        const record = createFieldCheckInRecord(payload);
        set((state) => ({
          records: [record, ...(state.records || [])].slice(0, 200),
        }));
        const author = buildBriefingAuthorFromViewer();
        const fieldLabel =
          payload?.fieldItem?.title ||
          payload?.fieldItem?.shortRegion ||
          payload?.fieldItem?.name ||
          "";
        emitCheckInNotification({
          actorName: author.authorName,
          fieldLabel,
          scheduleId: payload?.fieldItem?.scheduleId || null,
          checkInId: record.id,
          recipientUserId: author.authorUserId || null,
        });
        return record;
      },
      checkOut: (recordId) => {
        const now = new Date().toISOString();
        let updated = null;
        set((state) => ({
          records: (state.records || []).map((record) => {
            if (record.id !== recordId) return record;
            updated = { ...record, checkedOutAt: now };
            return updated;
          }),
        }));
        if (updated) {
          const author = buildBriefingAuthorFromViewer();
          emitCheckOutNotification({
            actorName: author.authorName,
            fieldLabel: updated.hubKey || "",
            checkInId: updated.id,
            recipientUserId: author.authorUserId || null,
          });
        }
        return updated;
      },
      attachExperienceToCheckIn: (recordId, experienceId) => {
        if (!recordId || !experienceId) return null;
        let updated = null;
        set((state) => ({
          records: (state.records || []).map((record) => {
            if (record.id !== recordId) return record;
            const ids = new Set(record.savedExperienceIds || []);
            ids.add(experienceId);
            updated = { ...record, savedExperienceIds: Array.from(ids) };
            return updated;
          }),
        }));
        return updated;
      },
      getActiveCheckIn: (fieldItem) => {
        const hubKey = getExperienceHubKey({ fieldItem });
        return (
          (get().records || []).find((record) => record.hubKey === hubKey && !record.checkedOutAt) || null
        );
      },
      clearCheckIns: () => set({ records: [] }),
    }),
    {
      name: "ildangmap_field_checkins_v1",
      version: 1,
    }
  )
);
