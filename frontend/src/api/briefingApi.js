import { createApiError, isMockApiEnabled, mockRequest, runApiRequest } from "./client";
import { BRIEFING_FILTERS, BRIEFING_ITEMS } from "../utils/briefingMock";
import { useUserStore } from "../store/useUserStore";
import { buildBriefingAuthorFromViewer } from "../utils/briefingAuthor";
import { loadStoredJobs } from "../utils/jobsStorage";
import { canAccessJobBriefing, getParticipantsArray, migrateJob } from "../utils/jobModel";
import { resolveViewerApplicantUserId } from "../utils/jobOwnership";
import { loadBriefingPostsForJob, saveBriefingPostsForJob } from "../utils/briefingPostsStorage";
import { mergeStoredJobBriefingPostsWithDemo } from "../utils/demoFieldOpsSeeds";
import { isDemoMode } from "../utils/demoMode";

export async function getBriefings() {
  return mockRequest(() => BRIEFING_ITEMS.map((x) => ({ ...x })));
}

export async function getBriefingFilters() {
  return mockRequest(() => BRIEFING_FILTERS.map((x) => ({ ...x })));
}

function findJob(jobId) {
  const id = Number(jobId);
  const list = loadStoredJobs();
  const arr = Array.isArray(list) ? list : [];
  const job = arr.find((j) => j && Number(j.id) === id);
  return job ? migrateJob(job) : null;
}

function mockViewerId() {
  const s = useUserStore.getState();
  return resolveViewerApplicantUserId({
    session: s.session,
    profile: s.profile,
  });
}

function assertMockBriefingAccess(job) {
  if (isDemoMode()) return 1;
  const viewer = mockViewerId();
  if (viewer == null || !Number.isFinite(Number(viewer))) {
    throw createApiError("로그인이 필요합니다.", 401);
  }
  if (!canAccessJobBriefing(job, viewer)) {
    throw createApiError("이 현장의 참여자만 브리핑룸을 볼 수 있습니다.", 403);
  }
  return Number(viewer);
}

function buildMockRoomPayload(job) {
  const applicants = getParticipantsArray(job);
  const parts = [];
  const ownerId = Number(job.ownerUserId);
  if (Number.isFinite(ownerId)) {
    parts.push({ userId: ownerId, displayName: "현장 소장", roleTag: "오야지" });
  }
  for (const a of applicants) {
    const st = String(a?.status || "").toLowerCase();
    if (st !== "accepted" && st !== "confirmed") continue;
    const uid = Number(a.applicantUserId ?? a.userId);
    if (!Number.isFinite(uid) || uid === ownerId) continue;
    parts.push({
      userId: uid,
      displayName: String(a.name || a.workerName || "기술자").trim() || "기술자",
      roleTag: String(a.role || job.role || "기공").trim(),
    });
  }
  const trade = job.trade || "";
  const role = job.role || "";
  const workSummary =
    `${trade} ${role}`.trim() ? `${`${trade} ${role}`.trim()} · ${job.title || "현장"}` : job.title || "현장";
  const entryInfo = String(job.locationText || "").trim() || "등록된 출입·집결 안내가 없습니다. 운영 기록에 남겨 주세요.";
  const parkingInfo = job.parkingAvailable
    ? "현장은 주차 가능으로 등록되어 있어요. 상세 위치는 운영 기록으로 공유해 주세요."
    : "주차 불가 또는 미등록 현장이에요. 운영 기록으로 안내해 주세요.";
  return {
    jobId: Number(job.id),
    title: job.title || "제목 없음",
    workDate: job.date || job.workDate || null,
    startTime: job.startTime ?? null,
    endTime: job.endTime ?? null,
    shortAddress: job.address || job.shortRegion || "",
    fullAddress: job.addressDetail || job.fullAddress || job.address || "",
    lat: job.lat != null ? Number(job.lat) : null,
    lng: job.lng != null ? Number(job.lng) : null,
    parkingAvailable: Boolean(job.parkingAvailable),
    trade,
    role,
    entryInfo,
    parkingInfo,
    workSummary,
    participants: parts,
  };
}

function normalizeWirePostType(t) {
  const s = String(t || "general").toLowerCase();
  if (s === "change" || s === "changed" || s === "change_request") return "change";
  if (s === "help_request" || s === "help") return "help_request";
  if (s === "notice" || s === "announcement" || s === "공지") return "general";
  return "general";
}

export async function fetchBriefingRoom(jobId) {
  const id = Number(jobId);
  return runApiRequest({
    path: `/jobs/${id}/briefing-room`,
    useMock: isMockApiEnabled(),
    mock: () => {
      const job = findJob(id);
      if (!job) throw createApiError("현장을 찾을 수 없습니다.", 404);
      assertMockBriefingAccess(job);
      return buildMockRoomPayload(job);
    },
  });
}

export async function fetchBriefingPosts(jobId) {
  const id = Number(jobId);
  return runApiRequest({
    path: `/jobs/${id}/briefing-posts`,
    useMock: isMockApiEnabled(),
    mock: () => {
      const job = findJob(id);
      if (!job) throw createApiError("현장을 찾을 수 없습니다.", 404);
      assertMockBriefingAccess(job);
      return mergeStoredJobBriefingPostsWithDemo(id, loadBriefingPostsForJob(id), new Date()).map((p) => ({
        id: p.id,
        body: p.body,
        postType: normalizeWirePostType(p.postType),
        authorUserId: p.authorUserId,
        authorName: p.authorName,
        authorImageUrl: p.authorImageUrl || "",
        authorRoleLabel: p.authorRoleLabel || "",
        authorBirthYear: Number.isFinite(Number(p.authorBirthYear)) ? Number(p.authorBirthYear) : null,
        createdAt: p.createdAt,
        imageDataUrl: p.imageDataUrl || null,
      }));
    },
  });
}

export async function createBriefingPost(jobId, { body, postType, imageDataUrl }) {
  const id = Number(jobId);
  const safeImage =
    imageDataUrl && String(imageDataUrl).trim().startsWith("data:image/") ? String(imageDataUrl).trim() : null;
  if (safeImage && safeImage.length > 200_000) {
    throw createApiError("첨부 이미지가 너무 큽니다.", 400);
  }
  return runApiRequest({
    path: `/jobs/${id}/briefing-posts`,
    method: "POST",
    body: {
      body: String(body || "").trim(),
      postType: normalizeWirePostType(postType),
      ...(safeImage ? { imageDataUrl: safeImage } : {}),
    },
    useMock: isMockApiEnabled(),
    mock: () => {
      const job = findJob(id);
      if (!job) throw createApiError("현장을 찾을 수 없습니다.", 404);
      const viewer = assertMockBriefingAccess(job);
      const text = String(body || "").trim();
      if (!text) throw createApiError("내용을 입력해 주세요.", 400);
      const author = buildBriefingAuthorFromViewer();
      const row = {
        id: `bp-${Date.now()}`,
        jobId: id,
        body: text,
        postType: normalizeWirePostType(postType),
        authorUserId: viewer,
        authorName: author.authorName,
        authorImageUrl: author.authorImageUrl,
        authorRoleLabel: author.authorRoleLabel,
        authorBirthYear: author.authorBirthYear ?? null,
        createdAt: new Date().toISOString(),
        imageDataUrl: safeImage,
      };
      const next = [row, ...loadBriefingPostsForJob(id)];
      saveBriefingPostsForJob(id, next);
      return {
        id: row.id,
        body: row.body,
        postType: row.postType,
        authorUserId: row.authorUserId,
        authorName: row.authorName,
        authorImageUrl: row.authorImageUrl,
        authorRoleLabel: row.authorRoleLabel,
        authorBirthYear: row.authorBirthYear ?? null,
        createdAt: row.createdAt,
        imageDataUrl: row.imageDataUrl || null,
      };
    },
  });
}
