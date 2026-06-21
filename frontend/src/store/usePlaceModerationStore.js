import { create } from "zustand";
import { PLACE_MODERATION_STATUS } from "../constants/placeModeration";
import {
  deletePlaceAdminApi,
  fetchPlaceModerationApi,
  fetchPlaceModerationStatusIndexApi,
  fetchPlaceReportsAdminApi,
  submitPlaceReportApi,
  submitPlaceVerifyApi,
  updatePlaceStatusAdminApi,
} from "../api/placeApi";
import { isMockApiEnabled } from "../api/client";
import { useUserStore } from "./useUserStore";
import { getDisplayNickname } from "../utils/displayNickname";
import {
  cacheModerationRecord,
  cacheModerationStatusIndex,
  cacheServerModeration,
  getPlaceModerationRecord,
  getUserVerifyVote,
} from "../utils/placeModeration";
import { mapAdminItemToRow, mapLocalModerationStatusToServer } from "../utils/placeModerationApi";
import {
  adminSetPlaceModerationStatus,
  listPlaceModerationForAdmin,
  recordPlaceReport,
  recordPlaceVerifyVote,
} from "../utils/placeModerationLegacy";

function resolveActorId() {
  const { profile, session } = useUserStore.getState();
  const user = session?.user;
  return String(profile?.id || user?.id || getDisplayNickname(profile, user) || "guest");
}

function toStoreResult(record) {
  return {
    reportCount: record.reportCount,
    moderationStatus: record.moderationStatus,
    record,
  };
}

export const usePlaceModerationStore = create((set, get) => ({
  revision: 0,
  statusIndexLoaded: false,

  bumpRevision: () => set((state) => ({ revision: state.revision + 1 })),

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

  syncFromServer: async (placeKey, meta = {}) => {
    if (!placeKey || isMockApiEnabled()) return get().getRecord(placeKey);
    try {
      const data = await fetchPlaceModerationApi(placeKey);
      const userId = resolveActorId();
      cacheServerModeration(placeKey, data, userId, meta);
      get().bumpRevision();
      return get().getRecord(placeKey);
    } catch (_) {
      return get().getRecord(placeKey);
    }
  },

  syncStatusIndex: async () => {
    if (isMockApiEnabled()) {
      set({ statusIndexLoaded: true });
      return;
    }
    try {
      const index = await fetchPlaceModerationStatusIndexApi();
      cacheModerationStatusIndex(index);
      set((state) => ({ revision: state.revision + 1, statusIndexLoaded: true }));
    } catch (_) {
      set({ statusIndexLoaded: true });
    }
  },

  submitReport: async (placeKey, reason, meta = {}) => {
    const userId = resolveActorId();
    if (isMockApiEnabled()) {
      const result = recordPlaceReport(placeKey, { reason, ...meta });
      get().bumpRevision();
      return toStoreResult(result.record || getPlaceModerationRecord(placeKey));
    }

    const data = await submitPlaceReportApi(placeKey, {
      reason,
      title: meta.title,
    });
    const record = cacheServerModeration(placeKey, data, userId, meta);
    get().bumpRevision();
    return toStoreResult(record);
  },

  submitVerifyVote: async (placeKey, vote, meta = {}) => {
    const userId = resolveActorId();
    if (isMockApiEnabled()) {
      const record = recordPlaceVerifyVote(placeKey, userId, vote, meta);
      get().bumpRevision();
      return record;
    }

    const data = await submitPlaceVerifyApi(placeKey, vote);
    const record = cacheServerModeration(placeKey, data, userId, meta);
    get().bumpRevision();
    return record;
  },

  fetchAdminList: async (sort = "reports") => {
    if (isMockApiEnabled()) {
      return {
        stats: null,
        items: listPlaceModerationForAdmin(),
      };
    }
    const data = await fetchPlaceReportsAdminApi({ sort });
    const items = (data?.items || []).map(mapAdminItemToRow);
    return { stats: data?.stats || null, items };
  },

  adminSetStatus: async (placeKey, status) => {
    if (isMockApiEnabled()) {
      const record = adminSetPlaceModerationStatus(placeKey, status);
      get().bumpRevision();
      return record;
    }

    const serverStatus = mapLocalModerationStatusToServer(status);
    const data = await updatePlaceStatusAdminApi(placeKey, serverStatus);
    const record = cacheServerModeration(placeKey, data, resolveActorId());
    get().bumpRevision();
    return record;
  },

  adminDeletePlace: async (placeKey) => {
    if (isMockApiEnabled()) {
      const record = adminSetPlaceModerationStatus(placeKey, PLACE_MODERATION_STATUS.DELETED);
      get().bumpRevision();
      return record;
    }

    const data = await deletePlaceAdminApi(placeKey);
    cacheModerationRecord(placeKey, {
      moderationStatus: PLACE_MODERATION_STATUS.DELETED,
      adminLocked: true,
      ...(data ? normalizeCacheFromDelete(data) : {}),
    });
    get().bumpRevision();
    return getPlaceModerationRecord(placeKey);
  },
}));

function normalizeCacheFromDelete(data) {
  return {
    reportCount: Number(data.reportCount) || 0,
    correctCount: Number(data.correctCount) || 0,
    wrongCount: Number(data.incorrectCount) || 0,
  };
}
