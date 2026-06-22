import { create } from "zustand";
import {
  createSiteBoardCommentApi,
  createSiteBoardPostApi,
  emptySiteBoardPayload,
  getSiteBoard,
  getSiteBoardData,
  hasSiteBoardPayload,
  normalizeSiteBoardPayload,
  putSiteBoardData,
  readLegacySiteBoardLocalStorage,
  removeLegacySiteBoardLocalStorage,
} from "../api/siteBoardApi";
import { getApiErrorMessage } from "../api/client";
import { emitSiteBoardPostNotification } from "./useNotificationStore";
import { useSettlementStore } from "./useSettlementStore";
import { resolveScheduleBriefingId } from "../utils/scheduleFieldOpsStorage";

let siteBoardBootstrapInFlight = null;

export const useSiteBoardStore = create((set, get) => ({
  boardsByBriefingId: {},
  siteBoardUserId: null,
  siteBoardLoaded: false,
  siteBoardLoading: false,
  siteBoardSyncing: false,
  siteBoardError: "",

  buildSiteBoardPayload: () =>
    normalizeSiteBoardPayload({ boardsByBriefingId: get().boardsByBriefingId }),

  applySiteBoardPayload: (payload) => {
    const normalized = normalizeSiteBoardPayload(payload);
    set({ boardsByBriefingId: normalized.boardsByBriefingId });
  },

  resetSiteBoards: () => {
    set({
      boardsByBriefingId: {},
      siteBoardUserId: null,
      siteBoardLoaded: false,
      siteBoardLoading: false,
      siteBoardSyncing: false,
      siteBoardError: "",
    });
  },

  getBoardSlice: (briefingId) => {
    const id = String(briefingId || "").trim();
    if (!id) return { posts: [], commentsByPostId: {} };
    const board = get().boardsByBriefingId[id];
    return board || { posts: [], commentsByPostId: {} };
  },

  setBoardSlice: (briefingId, board) => {
    const id = String(briefingId || "").trim();
    if (!id) return;
    set((state) => ({
      boardsByBriefingId: {
        ...state.boardsByBriefingId,
        [id]: {
          posts: Array.isArray(board?.posts) ? board.posts : [],
          commentsByPostId:
            board?.commentsByPostId && typeof board.commentsByPostId === "object"
              ? board.commentsByPostId
              : {},
        },
      },
    }));
  },

  bootstrapSiteBoards: async (userId) => {
    const uid = userId != null && userId !== "" ? String(userId) : null;
    if (!uid) {
      get().resetSiteBoards();
      return;
    }
    if (get().siteBoardUserId && get().siteBoardUserId !== uid) {
      get().resetSiteBoards();
    }
    if (get().siteBoardLoaded && get().siteBoardUserId === uid) return;

    if (siteBoardBootstrapInFlight) return siteBoardBootstrapInFlight;

    const run = (async () => {
      set({ siteBoardLoading: true, siteBoardError: "" });
      try {
        const server = normalizeSiteBoardPayload(await getSiteBoardData());
        if (hasSiteBoardPayload(server)) {
          get().applySiteBoardPayload(server);
          set({ siteBoardUserId: uid, siteBoardLoaded: true });
          return;
        }

        const legacy = readLegacySiteBoardLocalStorage();
        if (hasSiteBoardPayload(legacy)) {
          get().applySiteBoardPayload(legacy);
          const saved = normalizeSiteBoardPayload(await putSiteBoardData(get().buildSiteBoardPayload()));
          get().applySiteBoardPayload(saved);
          removeLegacySiteBoardLocalStorage();
          set({ siteBoardUserId: uid, siteBoardLoaded: true });
          return;
        }

        get().applySiteBoardPayload(emptySiteBoardPayload());
        set({ siteBoardUserId: uid, siteBoardLoaded: true });
      } catch (error) {
        const legacy = readLegacySiteBoardLocalStorage();
        if (hasSiteBoardPayload(legacy)) {
          get().applySiteBoardPayload(legacy);
          set({
            siteBoardUserId: uid,
            siteBoardLoaded: true,
            siteBoardError: getApiErrorMessage(error, "게시판을 불러오지 못했습니다. 오프라인 데이터를 표시합니다."),
          });
          return;
        }
        set({
          siteBoardError: getApiErrorMessage(error, "게시판을 불러오지 못했습니다."),
          siteBoardUserId: uid,
          siteBoardLoaded: true,
        });
      } finally {
        set({ siteBoardLoading: false });
      }
    })();

    siteBoardBootstrapInFlight = run;
    try {
      await run;
    } finally {
      siteBoardBootstrapInFlight = null;
    }
  },

  refreshBoard: async (briefingId) => {
    const id = String(briefingId || "").trim();
    if (!id) return { posts: [], commentsByPostId: {} };
    if (!get().siteBoardLoaded) {
      const slice = get().getBoardSlice(id);
      return { briefingId: id, posts: slice.posts, commentsByPostId: slice.commentsByPostId };
    }
    try {
      const board = await getSiteBoard(id);
      get().setBoardSlice(id, board);
      return board;
    } catch (error) {
      set({ siteBoardError: getApiErrorMessage(error, "게시판을 불러오지 못했습니다.") });
      const slice = get().getBoardSlice(id);
      return { briefingId: id, posts: slice.posts, commentsByPostId: slice.commentsByPostId };
    }
  },

  createPost: async (briefingId, payload) => {
    const post = await createSiteBoardPostApi(briefingId, payload);
    const board = get().getBoardSlice(briefingId);
    get().setBoardSlice(briefingId, {
      posts: [post, ...(board.posts || [])],
      commentsByPostId: board.commentsByPostId || {},
    });
    const schedules = useSettlementStore.getState().schedules;
    const list = Array.isArray(schedules) ? schedules : [];
    const bid = String(briefingId || "").trim();
    const schedule =
      list.find((s) => String(s?.briefingId || "").trim() === bid) ||
      list.find((s) => resolveScheduleBriefingId(s) === bid);
    if (post.postType === "general") {
      emitSiteBoardPostNotification({
        post,
        schedule,
        briefingId,
        actorName: post.authorName,
        recipientUserId: post.authorUserId,
      });
    }
    return post;
  },

  createComment: async (briefingId, postId, body) => {
    const comment = await createSiteBoardCommentApi(briefingId, postId, { body });
    const board = get().getBoardSlice(briefingId);
    const pid = String(postId);
    const commentsByPostId = { ...(board.commentsByPostId || {}) };
    commentsByPostId[pid] = [...(commentsByPostId[pid] || []), comment];
    const posts = (board.posts || []).map((p) =>
      String(p.id) === pid ? { ...p, updatedAt: comment.updatedAt || comment.createdAt } : p
    );
    get().setBoardSlice(briefingId, { posts, commentsByPostId });
    return comment;
  },
}));
