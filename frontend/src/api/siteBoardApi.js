import { isMockApiEnabled, runApiRequest } from "./client";
import { readJsonStorage, removeStorageKey, writeJsonStorage } from "../store/storeUtils";
import { BRIEFING_POSTS_STORAGE_KEY } from "../utils/briefingPostsStorage";

const COMMENTS_STORAGE_KEY = "ildangmap.fieldBoardComments.v1";
const MOCK_STORE_PREFIX = "ildangmap_site_board_server_mock_";

export { BRIEFING_POSTS_STORAGE_KEY, COMMENTS_STORAGE_KEY };

export function emptySiteBoardPayload() {
  return { boardsByBriefingId: {} };
}

export function normalizeSiteBoardPayload(raw) {
  const base = emptySiteBoardPayload();
  if (!raw || typeof raw !== "object") return base;
  const boardsRaw = raw.boardsByBriefingId && typeof raw.boardsByBriefingId === "object" ? raw.boardsByBriefingId : {};
  const boardsByBriefingId = {};
  Object.keys(boardsRaw).forEach((briefingId) => {
    const board = boardsRaw[briefingId];
    if (!board || typeof board !== "object") return;
    const posts = Array.isArray(board.posts) ? board.posts.map((p) => normalizePost(p, briefingId)) : [];
    const commentsByPostId = normalizeCommentsMap(board.commentsByPostId);
    boardsByBriefingId[String(briefingId).trim()] = { posts, commentsByPostId };
  });
  return { boardsByBriefingId };
}

function normalizePostType(t) {
  const s = String(t || "general").toLowerCase();
  if (s === "question" || s === "질문") return "question";
  if (s === "worklog" || s === "work_log" || s === "작업내용" || s === "작업일지") return "worklog";
  if (s === "photo" || s === "work_photo" || s === "작업사진") return "photo";
  if (s === "change" || s === "changed") return "change";
  if (s === "help_request" || s === "help") return "help_request";
  return "general";
}

function normalizePost(raw, briefingId) {
  if (!raw || typeof raw !== "object") return null;
  const createdAt = raw.createdAt || new Date().toISOString();
  return {
    id: String(raw.id || `sbp-${Date.now()}`),
    briefingId: String(raw.briefingId || briefingId || "").trim(),
    body: String(raw.body || "").trim(),
    postType: normalizePostType(raw.postType),
    authorUserId: Number.isFinite(Number(raw.authorUserId)) ? Number(raw.authorUserId) : null,
    authorName: String(raw.authorName || "작성자").trim() || "작성자",
    authorImageUrl: String(raw.authorImageUrl || "").trim(),
    authorRoleLabel: String(raw.authorRoleLabel || "").trim(),
    authorBirthYear: Number.isFinite(Number(raw.authorBirthYear)) ? Number(raw.authorBirthYear) : null,
    imageDataUrl: raw.imageDataUrl || null,
    createdAt,
    updatedAt: raw.updatedAt || createdAt,
  };
}

function normalizeComment(raw, postId) {
  if (!raw || typeof raw !== "object") return null;
  const createdAt = raw.createdAt || new Date().toISOString();
  return {
    id: String(raw.id || `fbc-${Date.now()}`),
    postId: String(raw.postId || postId || "").trim(),
    authorUserId: Number.isFinite(Number(raw.authorUserId)) ? Number(raw.authorUserId) : null,
    authorName: String(raw.authorName || "작성자").trim() || "작성자",
    body: String(raw.body || "").trim(),
    createdAt,
    updatedAt: raw.updatedAt || createdAt,
  };
}

function normalizeCommentsMap(raw) {
  if (!raw || typeof raw !== "object") return {};
  const out = {};
  Object.keys(raw).forEach((postId) => {
    const list = Array.isArray(raw[postId]) ? raw[postId] : [];
    out[postId] = list.map((c) => normalizeComment(c, postId)).filter(Boolean);
  });
  return out;
}

export function hasSiteBoardPayload(payload) {
  if (!payload?.boardsByBriefingId) return false;
  return Object.keys(payload.boardsByBriefingId).some((bid) => {
    const board = payload.boardsByBriefingId[bid];
    return (board?.posts?.length || 0) > 0 || Object.keys(board?.commentsByPostId || {}).length > 0;
  });
}

function readCommentsLegacyStorage() {
  const raw = readJsonStorage(COMMENTS_STORAGE_KEY, {});
  return raw && typeof raw === "object" ? raw : {};
}

/** localStorage ildangmap_briefing_posts_v1 + fieldBoardComments → server payload */
export function readLegacySiteBoardLocalStorage() {
  const allPosts = readJsonStorage(BRIEFING_POSTS_STORAGE_KEY, {});
  if (!allPosts || typeof allPosts !== "object") return null;

  const commentsAll = readCommentsLegacyStorage();
  const boardsByBriefingId = {};

  Object.keys(allPosts).forEach((key) => {
    const list = allPosts[key];
    if (!Array.isArray(list) || !list.length) return;
    let briefingId = key;
    if (key.startsWith("bf:")) briefingId = key.slice(3);
    else if (/^\d+$/.test(key)) return;

    const posts = list.map((p) => normalizePost({ ...p, briefingId }, briefingId)).filter(Boolean);
    const commentsByPostId = {};
    posts.forEach((post) => {
      const pk = `${briefingId}::${post.id}`;
      const legacyComments = commentsAll[pk];
      if (Array.isArray(legacyComments) && legacyComments.length) {
        commentsByPostId[post.id] = legacyComments.map((c) => normalizeComment(c, post.id)).filter(Boolean);
      }
    });
    if (posts.length || Object.keys(commentsByPostId).length) {
      boardsByBriefingId[briefingId] = { posts, commentsByPostId };
    }
  });

  if (!Object.keys(boardsByBriefingId).length) return null;
  return normalizeSiteBoardPayload({ boardsByBriefingId });
}

export function removeLegacySiteBoardLocalStorage() {
  removeStorageKey(BRIEFING_POSTS_STORAGE_KEY);
  removeStorageKey(COMMENTS_STORAGE_KEY);
}

function mockStorageKey(userId) {
  return `${MOCK_STORE_PREFIX}${userId}`;
}

function readMockSiteBoard(userId) {
  return normalizeSiteBoardPayload(readJsonStorage(mockStorageKey(userId), emptySiteBoardPayload()));
}

function writeMockSiteBoard(userId, payload) {
  writeJsonStorage(mockStorageKey(userId), normalizeSiteBoardPayload(payload));
}

function resolveUseMock() {
  return isMockApiEnabled();
}

export async function getSiteBoardData() {
  return runApiRequest({
    path: "/api/users/me/site-boards",
    useMock: resolveUseMock(),
    mock: () => {
      const userId = readJsonStorage("ildangmap_user_store_v1", {})?.state?.session?.user?.id || 1;
      return readMockSiteBoard(userId);
    },
  });
}

export async function putSiteBoardData(payload) {
  const body = normalizeSiteBoardPayload(payload);
  return runApiRequest({
    path: "/api/users/me/site-boards",
    method: "PUT",
    body,
    useMock: resolveUseMock(),
    mock: () => {
      const userId = readJsonStorage("ildangmap_user_store_v1", {})?.state?.session?.user?.id || 1;
      writeMockSiteBoard(userId, body);
      return body;
    },
  });
}

export async function getSiteBoard(briefingId) {
  const id = String(briefingId || "").trim();
  if (!id) return { briefingId: "", posts: [], commentsByPostId: {} };
  return runApiRequest({
    path: `/api/users/me/site-boards/${encodeURIComponent(id)}`,
    useMock: resolveUseMock(),
    mock: () => {
      const userId = readJsonStorage("ildangmap_user_store_v1", {})?.state?.session?.user?.id || 1;
      const all = readMockSiteBoard(userId);
      const board = all.boardsByBriefingId[id] || { posts: [], commentsByPostId: {} };
      return { briefingId: id, posts: board.posts || [], commentsByPostId: board.commentsByPostId || {} };
    },
  });
}

export async function createSiteBoardPostApi(briefingId, { body, postType, imageDataUrl }) {
  return runApiRequest({
    path: `/api/users/me/site-boards/${encodeURIComponent(briefingId)}/posts`,
    method: "POST",
    body: { body, postType, imageDataUrl: imageDataUrl || null },
    useMock: resolveUseMock(),
    mock: async () => {
      const userId = readJsonStorage("ildangmap_user_store_v1", {})?.state?.session?.user?.id || 1;
      const all = readMockSiteBoard(userId);
      const id = String(briefingId || "").trim();
      const now = new Date().toISOString();
      const post = normalizePost(
        {
          id: `sbp-${Date.now()}`,
          briefingId: id,
          body: String(body || "").trim() || (postType === "photo" ? "작업사진" : ""),
          postType,
          authorUserId: userId,
          authorName: "작성자",
          imageDataUrl: imageDataUrl || null,
          createdAt: now,
          updatedAt: now,
        },
        id
      );
      const board = all.boardsByBriefingId[id] || { posts: [], commentsByPostId: {} };
      board.posts = [post, ...(board.posts || [])];
      all.boardsByBriefingId[id] = board;
      writeMockSiteBoard(userId, all);
      return post;
    },
  });
}

export async function createSiteBoardCommentApi(briefingId, postId, { body }) {
  return runApiRequest({
    path: `/api/users/me/site-boards/${encodeURIComponent(briefingId)}/posts/${encodeURIComponent(postId)}/comments`,
    method: "POST",
    body: { body: String(body || "").trim() },
    useMock: resolveUseMock(),
    mock: async () => {
      const userId = readJsonStorage("ildangmap_user_store_v1", {})?.state?.session?.user?.id || 1;
      const all = readMockSiteBoard(userId);
      const id = String(briefingId || "").trim();
      const pid = String(postId || "").trim();
      const now = new Date().toISOString();
      const comment = normalizeComment(
        {
          id: `fbc-${Date.now()}`,
          postId: pid,
          authorUserId: userId,
          authorName: "작성자",
          body: String(body || "").trim(),
          createdAt: now,
          updatedAt: now,
        },
        pid
      );
      const board = all.boardsByBriefingId[id] || { posts: [], commentsByPostId: {} };
      board.commentsByPostId = board.commentsByPostId || {};
      board.commentsByPostId[pid] = [...(board.commentsByPostId[pid] || []), comment];
      board.posts = (board.posts || []).map((p) =>
        String(p.id) === pid ? { ...p, updatedAt: now } : p
      );
      all.boardsByBriefingId[id] = board;
      writeMockSiteBoard(userId, all);
      return comment;
    },
  });
}
