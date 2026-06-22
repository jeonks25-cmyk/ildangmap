import { createApiError, getApiErrorMessage } from "./client";
import { mergeStoredScheduleBriefingPostsWithDemo } from "../utils/demoFieldOpsSeeds";
import { isDemoMode } from "../utils/demoMode";
import { useSiteBoardStore } from "../store/useSiteBoardStore";
import { useUserStore } from "../store/useUserStore";
import {
  assertScheduleBoardRead,
  assertScheduleBoardWrite,
  findSchedulesByBriefingId,
  mapBoardApiErrorMessage,
  pickCanonicalSchedule,
} from "../utils/scheduleBoardAccess";

function normalizeWirePostType(t) {
  const s = String(t || "general").toLowerCase();
  if (s === "change" || s === "changed" || s === "change_request") return "change";
  if (s === "help_request" || s === "help") return "help_request";
  if (s === "notice" || s === "announcement" || s === "공지") return "general";
  if (s === "question" || s === "질문") return "question";
  if (s === "worklog" || s === "work_log" || s === "작업내용" || s === "작업일지") return "worklog";
  if (s === "photo" || s === "work_photo" || s === "작업사진") return "photo";
  return "general";
}

async function ensureSiteBoardReady() {
  const store = useSiteBoardStore.getState();
  if (store.siteBoardLoaded) return;
  const userId =
    useUserStore.getState().session?.user?.id ??
    useUserStore.getState().profile?.applicantUserId ??
    useUserStore.getState().profile?.id;
  if (userId != null) {
    await store.bootstrapSiteBoards(userId).catch(() => {
      /* bootstrapSiteBoards stores error in siteBoardError */
    });
  }
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
  };
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

export async function fetchScheduleBriefingPosts(briefingId, scheduleId) {
  const id = String(briefingId || "").trim();
  if (!id) return [];
  assertScheduleBoardRead({ briefingId: id, scheduleId });
  await ensureSiteBoardReady();
  const store = useSiteBoardStore.getState();
  const board = await store.refreshBoard(id);
  const posts = Array.isArray(board?.posts) ? board.posts : store.getBoardSlice(id).posts;
  const merged = isDemoMode() ? mergeStoredScheduleBriefingPostsWithDemo(id, posts, new Date()) : posts;
  return merged.map(mapPost);
}

export async function fetchScheduleBriefingComments(briefingId, postId, scheduleId) {
  const id = String(briefingId || "").trim();
  if (!id || !postId) return [];
  assertScheduleBoardRead({ briefingId: id, scheduleId });
  await ensureSiteBoardReady();
  const store = useSiteBoardStore.getState();
  await store.refreshBoard(id);
  const slice = store.getBoardSlice(id);
  return slice.commentsByPostId?.[String(postId)] || [];
}

export async function createScheduleBriefingPost(briefingId, { body, postType, imageDataUrl, scheduleId } = {}) {
  const id = String(briefingId || "").trim();
  if (!id) throw createApiError("일정을 찾을 수 없습니다.", 404);
  const safeImage =
    imageDataUrl && String(imageDataUrl).trim().startsWith("data:image/") ? String(imageDataUrl).trim() : null;
  if (safeImage && safeImage.length > 200_000) {
    throw createApiError("이미지 용량이 너무 큽니다.", 400);
  }
  assertScheduleBoardWrite({ briefingId: id, scheduleId });
  const text = String(body || "").trim();
  if (!text && !safeImage) throw createApiError("내용을 입력해 주세요.", 400);
  await ensureSiteBoardReady();
  try {
    const post = await useSiteBoardStore.getState().createPost(id, {
      body: text,
      postType: normalizeWirePostType(postType),
      imageDataUrl: safeImage,
    });
    return mapPost(post);
  } catch (error) {
    throw createApiError(mapBoardApiErrorMessage(error, getApiErrorMessage(error, "저장 중 오류가 발생했습니다.")), error?.status || 500);
  }
}

export async function createScheduleBriefingComment(briefingId, postId, { body, authorName, scheduleId } = {}) {
  const id = String(briefingId || "").trim();
  if (!id) throw createApiError("일정을 찾을 수 없습니다.", 404);
  assertScheduleBoardWrite({ briefingId: id, scheduleId });
  const text = String(body || "").trim();
  if (!text) throw createApiError("댓글 내용을 입력해 주세요.", 400);
  void authorName;
  await ensureSiteBoardReady();
  try {
    return await useSiteBoardStore.getState().createComment(id, postId, text);
  } catch (error) {
    throw createApiError(mapBoardApiErrorMessage(error, getApiErrorMessage(error, "저장 중 오류가 발생했습니다.")), error?.status || 500);
  }
}

export { normalizeWirePostType as normalizePostType, mapBoardApiErrorMessage };
