import { createApiError } from "./client";
import { useSettlementStore } from "../store/useSettlementStore";
import { useUserStore } from "../store/useUserStore";
import { loadStoredSchedules } from "../utils/scheduleModel";
import { mergeStoredScheduleBriefingPostsWithDemo } from "../utils/demoFieldOpsSeeds";
import { isDemoMode } from "../utils/demoMode";
import { loadStoredJobs } from "../utils/jobsStorage";
import { canAccessJobBriefing, migrateJob } from "../utils/jobModel";
import { resolveViewerApplicantUserId } from "../utils/jobOwnership";
import { useSiteBoardStore } from "../store/useSiteBoardStore";

function normalizeWirePostType(t) {
  const s = String(t || "general").toLowerCase();
  if (s === "change" || s === "changed" || s === "change_request") return "change";
  if (s === "help_request" || s === "help") return "help_request";
  if (s === "notice" || s === "announcement" || s === "공지") return "general";
  if (s === "question" || s === "질문") return "question";
  if (s === "worklog" || s === "work_log" || s === "작업내용") return "worklog";
  if (s === "photo" || s === "work_photo" || s === "작업사진") return "photo";
  return "general";
}

function findSchedulesByBriefingId(briefingId) {
  const bid = String(briefingId || "").trim();
  if (!bid) return [];
  const fromStore = useSettlementStore.getState().schedules;
  const list = Array.isArray(fromStore) && fromStore.length ? fromStore : loadStoredSchedules();
  return (Array.isArray(list) ? list : []).filter((s) => s && String(s.briefingId || "").trim() === bid);
}

function mockViewerId() {
  const s = useUserStore.getState();
  return resolveViewerApplicantUserId({
    session: s.session,
    profile: s.profile,
    authReady: s.authReady,
  });
}

function pickCanonicalSchedule(matches) {
  if (!matches.length) return null;
  const nonJoin = matches.filter((s) => !s.joinedFromScheduleId);
  const withOwner = nonJoin.find((s) => s.createdByUserId != null) || nonJoin[0];
  return withOwner || matches[0];
}

function assertScheduleBriefingAccess(briefingId) {
  if (isDemoMode()) return 1;
  const viewer = mockViewerId();
  if (viewer == null || !Number.isFinite(Number(viewer))) {
    throw createApiError("로그인이 필요합니다.", 401);
  }
  const matches = findSchedulesByBriefingId(briefingId);
  if (!matches.length) {
    throw createApiError("일정을 찾을 수 없습니다.", 404);
  }
  const primary = pickCanonicalSchedule(matches);
  if (!primary) throw createApiError("일정을 찾을 수 없습니다.", 404);

  const ownerId = Number(primary.createdByUserId);
  if (!Number.isFinite(ownerId) || ownerId <= 0) return Number(viewer);
  if (ownerId === viewer) return Number(viewer);
  if (matches.some((s) => s.acceptedParticipantUserId === viewer)) return Number(viewer);
  const invOk = matches.some((s) =>
    (s.scheduleInvites || []).some(
      (i) => i.userId === viewer && (String(i.status).toLowerCase() === "accepted" || String(i.status).toLowerCase() === "confirmed")
    )
  );
  if (invOk) return Number(viewer);
  if (primary.jobId != null) {
    const jobs = loadStoredJobs().map(migrateJob);
    const job = jobs.find((j) => j && Number(j.id) === Number(primary.jobId));
    if (job && canAccessJobBriefing(job, viewer)) return Number(viewer);
  }
  throw createApiError("이 현장 게시판에 접근할 수 없습니다.", 403);
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

export async function fetchScheduleBriefingRoom(briefingId) {
  const id = String(briefingId || "").trim();
  if (!id) throw createApiError("일정을 찾을 수 없습니다.", 404);
  const rows = findSchedulesByBriefingId(id);
  if (!rows.length) throw createApiError("일정을 찾을 수 없습니다.", 404);
  assertScheduleBriefingAccess(id);
  return buildRoomFromSchedule(pickCanonicalSchedule(rows));
}

export async function fetchScheduleBriefingPosts(briefingId) {
  const id = String(briefingId || "").trim();
  if (!id) return [];
  assertScheduleBriefingAccess(id);
  const store = useSiteBoardStore.getState();
  const board = await store.refreshBoard(id);
  const posts = Array.isArray(board?.posts) ? board.posts : store.getBoardSlice(id).posts;
  return mergeStoredScheduleBriefingPostsWithDemo(id, posts, new Date()).map(mapPost);
}

export async function fetchScheduleBriefingComments(briefingId, postId) {
  const id = String(briefingId || "").trim();
  if (!id || !postId) return [];
  assertScheduleBriefingAccess(id);
  const store = useSiteBoardStore.getState();
  await store.refreshBoard(id);
  const slice = store.getBoardSlice(id);
  return slice.commentsByPostId?.[String(postId)] || [];
}

export async function createScheduleBriefingPost(briefingId, { body, postType, imageDataUrl }) {
  const id = String(briefingId || "").trim();
  if (!id) throw createApiError("일정을 찾을 수 없습니다.", 404);
  const safeImage =
    imageDataUrl && String(imageDataUrl).trim().startsWith("data:image/") ? String(imageDataUrl).trim() : null;
  if (safeImage && safeImage.length > 200_000) {
    throw createApiError("첨부 이미지가 너무 큽니다.", 400);
  }
  assertScheduleBriefingAccess(id);
  const text = String(body || "").trim();
  if (!text && !safeImage) throw createApiError("내용을 입력해 주세요.", 400);
  const post = await useSiteBoardStore.getState().createPost(id, {
    body: text,
    postType: normalizeWirePostType(postType),
    imageDataUrl: safeImage,
  });
  return mapPost(post);
}

export async function createScheduleBriefingComment(briefingId, postId, { body, authorName }) {
  const id = String(briefingId || "").trim();
  if (!id) throw createApiError("일정을 찾을 수 없습니다.", 404);
  assertScheduleBriefingAccess(id);
  const text = String(body || "").trim();
  if (!text) throw createApiError("댓글 내용을 입력해 주세요.", 400);
  void authorName;
  const comment = await useSiteBoardStore.getState().createComment(id, postId, text);
  return comment;
}

export { normalizeWirePostType as normalizePostType };
