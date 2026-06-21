/**
 * MVP 시연용: REST mock + 로컬 스토리지에 글이 없어도 항상 보이는
 * “현장 운영 로그” 데모 포스트 (실제 현장팀 톤, 고정 id로 사용자 저장본과 병합).
 */

function toDateKeyFromDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function wirePost(row) {
  return {
    id: row.id,
    body: row.body,
    postType: row.postType,
    authorUserId: row.authorUserId,
    authorName: row.authorName,
    authorImageUrl: row.authorImageUrl || "",
    authorRoleLabel: row.authorRoleLabel || "",
    createdAt: row.createdAt,
    imageDataUrl: row.imageDataUrl || null,
  };
}

/** Job #1 (둔산동 필름 시공) — 운영 기록 탭 / 브리핑 mock */
export function buildDemoBriefingPostRowsForJob(jobId, now = new Date()) {
  const id = Number(jobId);
  if (!Number.isFinite(id) || id !== 1) return [];
  const key = toDateKeyFromDate(now);
  return [
    {
      id: "demo-field-ops-1",
      jobId: 1,
      body: "지하주차장 B2 사용하세요",
      postType: "general",
      authorUserId: 902,
      authorName: "현장소장",
      authorRoleLabel: "오야지",
      createdAt: `${key}T07:12:00+09:00`,
    },
    {
      id: "demo-field-ops-2",
      jobId: 1,
      body: "엘베 사용 가능합니다",
      postType: "change",
      authorUserId: 902,
      authorName: "현장소장",
      authorRoleLabel: "오야지",
      createdAt: `${key}T07:48:00+09:00`,
    },
    {
      id: "demo-field-ops-3",
      jobId: 1,
      body: "1층에서 자재 같이 올려주실 분",
      postType: "help_request",
      authorUserId: 903,
      authorName: "기공 김반장",
      authorRoleLabel: "기술자",
      createdAt: `${key}T08:21:00+09:00`,
    },
    {
      id: "demo-field-ops-4",
      jobId: 1,
      body: "점심 12시 10분",
      postType: "general",
      authorUserId: 902,
      authorName: "현장소장",
      authorRoleLabel: "오야지",
      createdAt: `${key}T11:32:00+09:00`,
    },
  ];
}

/** 공유 일정 briefingId 데모 — 캘린더 공유 시드용 */
export function buildDemoBriefingPostRowsForBriefingId(briefingId, now = new Date()) {
  const bid = String(briefingId || "").trim();
  if (bid !== "br-demo-shared-calendar") return [];
  const key = toDateKeyFromDate(now);
  return [
    {
      id: "demo-shared-br-1",
      body: "오후 차수는 3층 집결 후 바로 투입입니다.",
      postType: "general",
      authorUserId: 1,
      authorName: "팀장",
      authorRoleLabel: "오야지",
      createdAt: `${key}T12:40:00+09:00`,
    },
    {
      id: "demo-shared-br-2",
      body: "자재는 후문으로만 반입 부탁드립니다.",
      postType: "change",
      authorUserId: 1,
      authorName: "팀장",
      authorRoleLabel: "오야지",
      createdAt: `${key}T12:55:00+09:00`,
    },
  ];
}

export function mergeStoredJobBriefingPostsWithDemo(_jobId, storedPosts) {
  const stored = Array.isArray(storedPosts) ? storedPosts.filter(Boolean) : [];
  return stored
    .slice()
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .map(wirePost);
}

export function mergeStoredScheduleBriefingPostsWithDemo(_briefingId, storedPosts) {
  const stored = Array.isArray(storedPosts) ? storedPosts.filter(Boolean) : [];
  return stored
    .slice()
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .map(wirePost);
}
