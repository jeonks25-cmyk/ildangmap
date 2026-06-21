import { create } from "zustand";
import { useUserStore } from "./useUserStore";
import { getDisplayNickname } from "../utils/displayNickname";
import {
  adminSetPlaceModerationStatus,
  getPlaceModerationRecord,
  getUserVerifyVote,
  recordPlaceReport,
  recordPlaceVerifyVote,
} from "../utils/placeModeration";

function resolveActorId() {
  const { profile, session } = useUserStore.getState();
  const user = session?.user;
  return String(profile?.id || user?.id || getDisplayNickname(profile, user) || "guest");
}

export const usePlaceModerationStore = create((set) => ({
  revision: 0,

  getRecord: (placeKey) => {
    const record = getPlaceModerationRecord(placeKey);
    const userId = resolveActorId();
    return {
      ...record,
      verify: {
        correct: record.correctCount,
        wrong: record.wrongCount,
        myVote: getUserVerifyVote(placeKey, userId),
      },
    };
  },

  submitReport: (placeKey, reason, meta = {}) => {
    const result = recordPlaceReport(placeKey, { reason, ...meta });
    set((state) => ({ revision: state.revision + 1 }));
    return result;
  },

  submitVerifyVote: (placeKey, vote, meta = {}) => {
    const userId = resolveActorId();
    const record = recordPlaceVerifyVote(placeKey, userId, vote, meta);
    set((state) => ({ revision: state.revision + 1 }));
    return record;
  },

  adminSetStatus: (placeKey, status) => {
    const record = adminSetPlaceModerationStatus(placeKey, status);
    set((state) => ({ revision: state.revision + 1 }));
    return record;
  },
}));
