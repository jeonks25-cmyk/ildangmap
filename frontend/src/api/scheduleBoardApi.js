import { createApiError, runApiRequest } from "./client";

export async function fetchScheduleBoardSummary(scheduleId) {
  const sid = String(scheduleId || "").trim();
  if (!sid) {
    return { unreadNoticeCount: 0, unreadPostCount: 0, unreadTotalCount: 0 };
  }
  try {
    const data = await runApiRequest({
      path: `/api/schedules/${encodeURIComponent(sid)}/board/summary`,
    });
    return {
      scheduleId: data?.scheduleId || sid,
      unreadNoticeCount: Number(data?.unreadNoticeCount) || 0,
      unreadPostCount: Number(data?.unreadPostCount) || 0,
      unreadTotalCount: Number(data?.unreadTotalCount) || 0,
      lastPostAt: data?.lastPostAt || null,
    };
  } catch (error) {
    if (error?.status === 401 || error?.status === 403 || error?.status === 404) {
      return { unreadNoticeCount: 0, unreadPostCount: 0, unreadTotalCount: 0 };
    }
    throw error;
  }
}

export async function fetchScheduleBoardPosts(scheduleId) {
  const sid = String(scheduleId || "").trim();
  if (!sid) return [];
  const data = await runApiRequest({
    path: `/api/schedules/${encodeURIComponent(sid)}/board/posts`,
  });
  const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  return items.map(mapPostFromApi).filter(Boolean);
}

export async function createScheduleBoardPost(scheduleId, payload) {
  const sid = String(scheduleId || "").trim();
  if (!sid) throw createApiError("일정을 찾을 수 없습니다.", 404);
  const data = await runApiRequest({
    path: `/api/schedules/${encodeURIComponent(sid)}/board/posts`,
    method: "POST",
    body: buildPostBody(payload),
  });
  return mapPostFromApi(data);
}

export async function fetchScheduleBoardComments(scheduleId, postId) {
  const sid = String(scheduleId || "").trim();
  const pid = Number(postId);
  if (!sid || !Number.isFinite(pid)) return [];
  const data = await runApiRequest({
    path: `/api/schedules/${encodeURIComponent(sid)}/board/posts/${pid}/comments`,
  });
  const list = Array.isArray(data) ? data : [];
  return list.map(mapCommentFromApi);
}

export async function createScheduleBoardComment(scheduleId, postId, { body, mentions } = {}) {
  const sid = String(scheduleId || "").trim();
  const pid = Number(postId);
  if (!sid) throw createApiError("일정을 찾을 수 없습니다.", 404);
  const data = await runApiRequest({
    path: `/api/schedules/${encodeURIComponent(sid)}/board/posts/${pid}/comments`,
    method: "POST",
    body: { body: String(body || "").trim(), mentions: Array.isArray(mentions) ? mentions : [] },
  });
  return mapCommentFromApi(data);
}

export async function markScheduleBoardPostRead(scheduleId, postId) {
  const sid = String(scheduleId || "").trim();
  const pid = Number(postId);
  if (!sid || !Number.isFinite(pid)) return null;
  return runApiRequest({
    path: `/api/schedules/${encodeURIComponent(sid)}/board/posts/${pid}/read`,
    method: "POST",
    body: {},
  });
}

export async function fetchPendingBoardNotifications() {
  const data = await runApiRequest({ path: "/api/users/me/board-notifications" });
  return Array.isArray(data) ? data : [];
}

export async function markBoardNotificationsDelivered(ids) {
  const list = Array.isArray(ids) ? ids.filter((id) => Number.isFinite(Number(id))) : [];
  if (!list.length) return;
  await runApiRequest({
    path: "/api/users/me/board-notifications/delivered",
    method: "POST",
    body: { ids: list },
  });
}

function buildPostBody({ body, postType, imageDataUrl, imageDataUrls, briefingId, mentions } = {}) {
  const images = [];
  if (Array.isArray(imageDataUrls)) {
    for (const raw of imageDataUrls) {
      if (raw && String(raw).trim().startsWith("data:image/")) images.push(String(raw).trim());
    }
  }
  if (imageDataUrl && String(imageDataUrl).trim().startsWith("data:image/")) {
    if (!images.length) images.push(String(imageDataUrl).trim());
  }
  return {
    postType: wirePostType(postType),
    body: String(body || "").trim(),
    briefingId: briefingId ? String(briefingId).trim() : undefined,
    imageDataUrl: images[0] || undefined,
    imageDataUrls: images.length > 1 ? images : images.length ? images : undefined,
    mentions: Array.isArray(mentions) ? mentions : [],
  };
}

export function wirePostType(t) {
  const s = String(t || "notice").toLowerCase();
  if (s === "general" || s === "announcement" || s === "공지") return "notice";
  if (s === "question" || s === "질문") return "question";
  if (s === "worklog" || s === "work_log" || s === "작업내용" || s === "작업일지") return "worklog";
  if (s === "photo" || s === "work_photo" || s === "작업사진") return "photo";
  return s;
}

export function uiPostType(t) {
  const s = wirePostType(t);
  if (s === "notice") return "notice";
  return s;
}

function mapPostFromApi(p) {
  if (!p || typeof p !== "object") return null;
  const imageCount = Number(p.imageCount) || (p.imageDataUrl ? 1 : 0);
  return {
    id: p.id,
    scheduleId: p.scheduleId,
    briefingId: p.briefingId,
    body: p.body,
    postType: uiPostType(p.postType),
    authorUserId: p.authorUserId,
    authorName: p.authorName,
    authorImageUrl: p.authorImageUrl || "",
    createdAt: p.createdAt,
    updatedAt: p.updatedAt || p.createdAt,
    imageDataUrl: p.imageDataUrl || null,
    imageCount,
    commentCount: Number(p.commentCount) || 0,
    isRead: p.isRead === true,
  };
}

function mapCommentFromApi(c) {
  if (!c || typeof c !== "object") return null;
  return {
    id: c.id,
    postId: c.postId,
    authorUserId: c.authorUserId,
    authorName: c.authorName,
    body: c.body,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt || c.createdAt,
  };
}
