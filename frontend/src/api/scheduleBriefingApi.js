import { createApiError, getApiErrorMessage } from "./client";
import {
  createScheduleBoardComment,
  createScheduleBoardPost,
  fetchScheduleBoardComments,
  fetchScheduleBoardPosts,
  fetchScheduleBoardSummary,
  markScheduleBoardPostRead,
  uiPostType,
  wirePostType,
} from "./scheduleBoardApi";
import { mergeStoredScheduleBriefingPostsWithDemo } from "../utils/demoFieldOpsSeeds";
import { isDemoMode } from "../utils/demoMode";
import {
  assertScheduleBoardRead,
  assertScheduleBoardWrite,
  findSchedulesByBriefingId,
  mapBoardApiErrorMessage,
  pickCanonicalSchedule,
} from "../utils/scheduleBoardAccess";

function normalizeWirePostType(t) {
  return uiPostType(t);
}

function mapPost(p) {
  return {
    id: p.id,
    body: p.body,
    postType: normalizeWirePostType(p.postType),
    authorUserId: p.authorUserId,
    authorName: p.authorName,
    authorImageUrl: p.authorImageUrl || "",
    authorRoleLabel: p.authorRoleLabel || "",
    authorBirthYear: Number.isFinite(Number(p.authorBirthYear)) ? Number(p.authorBirthYear) : null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt || p.createdAt,
    imageDataUrl: p.imageDataUrl || null,
    imageCount: Number(p.imageCount) || (p.imageDataUrl ? 1 : 0),
    commentCount: Number(p.commentCount) || 0,
    isRead: p.isRead === true,
  };
}

function resolveScheduleId(scheduleId, briefingId) {
  const direct = String(scheduleId || "").trim();
  if (direct) return direct;
  const rows = findSchedulesByBriefingId(briefingId);
  const schedule = pickCanonicalSchedule(rows);
  return schedule?.id ? String(schedule.id) : "";
}

function buildRoomFromSchedule(schedule) {
  const parts = [];
  const ownerId = Number(schedule.createdByUserId);
  if (Number.isFinite(ownerId) && ownerId > 0) {
    parts.push({ userId: ownerId, displayName: "현장 소장", roleTag: "오야지" });
  }
  const invites = Array.isArray(schedule.scheduleInvites) ? schedule.scheduleInvites : [];
  for (const inv of invites) {
    if (!inv) continue;
    const st = String(inv.status || "").toLowerCase();
    if (st !== "accepted" && st !== "confirmed") continue;
    const uid = Number(inv.userId);
    if (!Number.isFinite(uid) || uid === ownerId) continue;
    parts.push({ userId: uid, displayName: String(inv.name || "").trim() || "기술자", roleTag: "참여" });
  }
  const ap = Number(schedule.acceptedParticipantUserId);
  if (Number.isFinite(ap) && ap > 0 && !parts.some((p) => p.userId === ap)) {
    parts.push({ userId: ap, displayName: "참여 기술자", roleTag: "참여" });
  }
  const workSummary =
    String(schedule.workDetails || "").trim() ||
    (Array.isArray(schedule.summaryLines) && schedule.summaryLines[0]) ||
    schedule.title ||
    "현장 작업";
  const entryInfo =
    String(schedule.entryInfo || "").trim() ||
    String(schedule.accessPassword || "").trim() ||
    "등록된 출입·집결 안내가 없습니다. 게시판에 남겨 주세요.";
  const parkingInfo =
    String(schedule.parkingInfo || "").trim() ||
    String(schedule.parkingNote || "").trim() ||
    "주차 안내가 없습니다. 게시판에 남겨 주세요.";
  return {
    briefingId: String(schedule.briefingId),
    jobId: schedule.jobId != null ? Number(schedule.jobId) : null,
    title: schedule.title || "현장 일정",
    workDate: schedule.workDate || null,
    scheduleWorkTime: String(schedule.workTime || "").trim(),
    startTime: null,
    endTime: null,
    shortAddress: schedule.shortRegion || "",
    fullAddress: schedule.fullAddress || schedule.shortRegion || "",
    lat: schedule.lat != null ? Number(schedule.lat) : null,
    lng: schedule.lng != null ? Number(schedule.lng) : null,
    parkingAvailable: /가능|주차/.test(String(schedule.parkingInfo || schedule.parkingNote || "")),
    trade: "",
    role: "",
    entryInfo,
    parkingInfo,
    workSummary,
    participants: parts,
  };
}

export async function fetchScheduleBriefingRoom(briefingId, scheduleId) {
  const id = String(briefingId || "").trim();
  if (!id) throw createApiError("일정을 찾을 수 없습니다.", 404);
  assertScheduleBoardRead({ briefingId: id, scheduleId });
  const rows = findSchedulesByBriefingId(id, scheduleId);
  if (!rows.length) throw createApiError("일정을 찾을 수 없습니다.", 404);
  return buildRoomFromSchedule(pickCanonicalSchedule(rows));
}

export async function fetchScheduleBoardSummaryForSchedule(scheduleId, briefingId) {
  const sid = resolveScheduleId(scheduleId, briefingId);
  if (!sid) return { unreadNoticeCount: 0, unreadPostCount: 0, unreadTotalCount: 0 };
  assertScheduleBoardRead({ briefingId, scheduleId: sid });
  return fetchScheduleBoardSummary(sid);
}

export async function fetchScheduleBriefingPosts(briefingId, scheduleId) {
  const id = String(briefingId || "").trim();
  const sid = resolveScheduleId(scheduleId, id);
  if (!sid) return [];
  assertScheduleBoardRead({ briefingId: id, scheduleId: sid });
  try {
    const posts = await fetchScheduleBoardPosts(sid);
    const merged = isDemoMode() ? mergeStoredScheduleBriefingPostsWithDemo(id, posts, new Date()) : posts;
    return merged.map(mapPost);
  } catch (error) {
    throw createApiError(
      mapBoardApiErrorMessage(error, getApiErrorMessage(error, "게시판을 불러오지 못했습니다.")),
      error?.status || 500
    );
  }
}

export async function fetchScheduleBriefingComments(briefingId, postId, scheduleId) {
  const id = String(briefingId || "").trim();
  const sid = resolveScheduleId(scheduleId, id);
  if (!sid || postId == null) return [];
  assertScheduleBoardRead({ briefingId: id, scheduleId: sid });
  try {
    return await fetchScheduleBoardComments(sid, postId);
  } catch (error) {
    throw createApiError(
      mapBoardApiErrorMessage(error, getApiErrorMessage(error, "댓글을 불러오지 못했습니다.")),
      error?.status || 500
    );
  }
}

export async function markScheduleBriefingPostRead(briefingId, postId, scheduleId) {
  const sid = resolveScheduleId(scheduleId, briefingId);
  if (!sid || postId == null) return null;
  assertScheduleBoardRead({ briefingId, scheduleId: sid });
  return markScheduleBoardPostRead(sid, postId);
}

export async function createScheduleBriefingPost(briefingId, { body, postType, imageDataUrl, imageDataUrls, scheduleId } = {}) {
  const id = String(briefingId || "").trim();
  const sid = resolveScheduleId(scheduleId, id);
  if (!sid) throw createApiError("일정을 찾을 수 없습니다.", 404);
  const safeImages = [];
  const pushImage = (raw) => {
    const s = raw && String(raw).trim();
    if (s && s.startsWith("data:image/")) safeImages.push(s);
  };
  if (Array.isArray(imageDataUrls)) imageDataUrls.forEach(pushImage);
  pushImage(imageDataUrl);
  for (const img of safeImages) {
    if (img.length > 200_000) throw createApiError("이미지 용량이 너무 큽니다.", 400);
  }
  assertScheduleBoardWrite({ briefingId: id, scheduleId: sid });
  const text = String(body || "").trim();
  if (!text && !safeImages.length) throw createApiError("내용을 입력해 주세요.", 400);
  try {
    const post = await createScheduleBoardPost(sid, {
      body: text,
      postType: wirePostType(postType),
      imageDataUrl: safeImages[0] || null,
      imageDataUrls: safeImages,
      briefingId: id,
    });
    return mapPost(post);
  } catch (error) {
    throw createApiError(
      mapBoardApiErrorMessage(error, getApiErrorMessage(error, "저장 중 오류가 발생했습니다.")),
      error?.status || 500
    );
  }
}

export async function createScheduleBriefingComment(briefingId, postId, { body, authorName, scheduleId, mentions } = {}) {
  const id = String(briefingId || "").trim();
  const sid = resolveScheduleId(scheduleId, id);
  if (!sid) throw createApiError("일정을 찾을 수 없습니다.", 404);
  assertScheduleBoardWrite({ briefingId: id, scheduleId: sid });
  const text = String(body || "").trim();
  if (!text) throw createApiError("댓글 내용을 입력해 주세요.", 400);
  void authorName;
  try {
    return await createScheduleBoardComment(sid, postId, { body: text, mentions });
  } catch (error) {
    throw createApiError(
      mapBoardApiErrorMessage(error, getApiErrorMessage(error, "저장 중 오류가 발생했습니다.")),
      error?.status || 500
    );
  }
}

export { normalizeWirePostType as normalizePostType, mapBoardApiErrorMessage };
