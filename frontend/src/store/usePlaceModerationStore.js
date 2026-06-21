import { create } from "zustand";
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

/** 장소 신고·검증 — localStorage 전용 (Vercel 프론트 단독 배포) */
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
      get().bumpRevision();
    }
    return get().getRecord(placeKey);
  },

  syncStatusIndex: async () => {
    set({ statusIndexLoaded: true });
  },

  submitReport: async (placeKey, reason, meta = {}) => {
    const result = recordPlaceReport(placeKey, { reason, ...meta });
    get().bumpRevision();
    return toStoreResult(result.record || getPlaceModerationRecord(placeKey));
  },

  submitVerifyVote: async (placeKey, vote, meta = {}) => {
    const userId = resolveActorId();
    const record = recordPlaceVerifyVote(placeKey, userId, vote, meta);
    get().bumpRevision();
    return record;
  },

  fetchAdminList: async (sort = "reports") => {
    const items = sortAdminRows(listPlaceModerationForAdmin(), sort);
    return {
      stats: buildLocalAdminStats(items),
      items,
    };
  },

  adminSetStatus: async (placeKey, status) => {
    const record = adminSetPlaceModerationStatus(placeKey, status);
    get().bumpRevision();
    return record;
  },

  adminDeletePlace: async (placeKey) => {
    const record = adminSetPlaceModerationStatus(placeKey, PLACE_MODERATION_STATUS.DELETED);
    get().bumpRevision();
    return record;
  },
}));
