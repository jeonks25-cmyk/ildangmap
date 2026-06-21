import { create } from "zustand";
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
import { PLACE_MODERATION_STATUS } from "../constants/placeModeration";
import { useUserStore } from "./useUserStore";
import { getDisplayNickname } from "../utils/displayNickname";
import {
  cacheModerationRecord,
  getPlaceModerationRecord,
  getUserVerifyVote,
} from "../utils/placeModeration";
import {
  adminSetPlaceModerationStatus,
  listPlaceModerationForAdmin,
  recordPlaceReport,
  recordPlaceVerifyVote,
} from "../utils/placeModerationLegacy";
import {
  mapAdminItemToRow,
  mapLocalModerationStatusToServer,
  normalizeServerModeration,
} from "../utils/placeModerationApi";

function resolveActorId() {
  const { profile, session } = useUserStore.getState();
  const user = session?.user;
  return String(profile?.id || user?.id || getDisplayNickname(profile, user) || "guest");
}

function resolvePlaceId(placeKey, meta = {}) {
  const fromMeta = meta.mapItemId || meta.placeId;
  if (fromMeta != null && String(fromMeta).trim()) return String(fromMeta).trim();
  return String(placeKey || "").trim();
}

function toStoreResult(record) {
  return {
    reportCount: record.reportCount,
    moderationStatus: record.moderationStatus,
    record,
  };
}

function sortAdminRows(items, sort) {
  const list = Array.isArray(items) ? [...items] : [];
  if (sort === "recent") {
    return list.sort((a, b) => String(b.lastReportAt || "").localeCompare(String(a.lastReportAt || "")));
  }
  return list.sort((a, b) => {
    const countDiff = (Number(b.reportCount) || 0) - (Number(a.reportCount) || 0);
    if (countDiff !== 0) return countDiff;
    return String(b.lastReportAt || "").localeCompare(String(a.lastReportAt || ""));
  });
}

function buildLocalAdminStats(items) {
  const rows = Array.isArray(items) ? items : [];
  return {
    totalPlaces: rows.length,
    pendingReview: rows.filter((r) => r.moderationStatus === PLACE_MODERATION_STATUS.PENDING_REVIEW).length,
    hidden: rows.filter((r) => r.moderationStatus === PLACE_MODERATION_STATUS.HIDDEN).length,
    deleteCandidate: rows.filter((r) => r.moderationStatus === PLACE_MODERATION_STATUS.DELETE_CANDIDATE).length,
  };
}

function cacheServerRecord(placeKey, payload, meta = {}) {
  const userId = resolveActorId();
  const normalized = normalizeServerModeration(placeKey, payload, userId);
  cacheModerationRecord(placeKey, {
    ...normalized,
    title: meta.title || normalized.title,
    mapItemId: meta.mapItemId || normalized.mapItemId,
  });
  return getPlaceModerationRecord(placeKey);
}

/** 장소 신고·검증 — API 우선, 실패 시 localStorage fallback */
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
    if (!placeKey) return get().getRecord(placeKey);
    const prev = getPlaceModerationRecord(placeKey);
    if (meta.title || meta.mapItemId) {
      cacheModerationRecord(placeKey, {
        ...prev,
        title: meta.title || prev.title,
        mapItemId: meta.mapItemId || prev.mapItemId,
      });
    }

    if (!isMockApiEnabled()) {
      try {
        const placeId = resolvePlaceId(placeKey, meta);
        const payload = await fetchPlaceModerationApi(placeId);
        cacheServerRecord(placeKey, payload, meta);
        get().bumpRevision();
      } catch (error) {
        console.warn("[usePlaceModerationStore] syncFromServer fallback to local", error);
      }
    }

    return get().getRecord(placeKey);
  },

  syncStatusIndex: async () => {
    if (!isMockApiEnabled()) {
      try {
        await fetchPlaceModerationStatusIndexApi();
      } catch (error) {
        console.warn("[usePlaceModerationStore] syncStatusIndex fallback", error);
      }
    }
    set({ statusIndexLoaded: true });
  },

  submitReport: async (placeKey, reason, meta = {}) => {
    const placeId = resolvePlaceId(placeKey, meta);

    if (!isMockApiEnabled()) {
      try {
        const payload = await submitPlaceReportApi(placeId, {
          reason,
          title: meta.title || "",
        });
        const record = cacheServerRecord(placeKey, payload, meta);
        get().bumpRevision();
        return toStoreResult(record);
      } catch (error) {
        console.warn("[usePlaceModerationStore] submitReport fallback to local", error);
      }
    }

    const result = recordPlaceReport(placeKey, { reason, ...meta });
    get().bumpRevision();
    return toStoreResult(result.record || getPlaceModerationRecord(placeKey));
  },

  submitVerifyVote: async (placeKey, vote, meta = {}) => {
    const userId = resolveActorId();
    const placeId = resolvePlaceId(placeKey, meta);

    if (!isMockApiEnabled()) {
      try {
        const payload = await submitPlaceVerifyApi(placeId, vote);
        cacheServerRecord(placeKey, payload, meta);
        get().bumpRevision();
        return getPlaceModerationRecord(placeKey);
      } catch (error) {
        console.warn("[usePlaceModerationStore] submitVerifyVote fallback to local", error);
      }
    }

    const record = recordPlaceVerifyVote(placeKey, userId, vote, meta);
    get().bumpRevision();
    return record;
  },

  fetchAdminList: async (sort = "reports") => {
    if (!isMockApiEnabled()) {
      try {
        const payload = await fetchPlaceReportsAdminApi({ sort });
        const items = sortAdminRows(
          (Array.isArray(payload?.items) ? payload.items : []).map(mapAdminItemToRow),
          sort
        );
        return {
          stats: payload?.stats || buildLocalAdminStats(items),
          items,
        };
      } catch (error) {
        console.warn("[usePlaceModerationStore] fetchAdminList fallback to local", error);
      }
    }

    const items = sortAdminRows(listPlaceModerationForAdmin(), sort);
    return {
      stats: buildLocalAdminStats(items),
      items,
    };
  },

  adminSetStatus: async (placeKey, status) => {
    if (!isMockApiEnabled()) {
      try {
        await updatePlaceStatusAdminApi(placeKey, mapLocalModerationStatusToServer(status));
      } catch (error) {
        console.warn("[usePlaceModerationStore] adminSetStatus API failed, updating local", error);
      }
    }
    const record = adminSetPlaceModerationStatus(placeKey, status);
    get().bumpRevision();
    return record;
  },

  adminDeletePlace: async (placeKey) => {
    if (!isMockApiEnabled()) {
      try {
        await deletePlaceAdminApi(placeKey);
      } catch (error) {
        console.warn("[usePlaceModerationStore] adminDeletePlace API failed, updating local", error);
      }
    }
    const record = adminSetPlaceModerationStatus(placeKey, PLACE_MODERATION_STATUS.DELETED);
    get().bumpRevision();
    return record;
  },
}));
