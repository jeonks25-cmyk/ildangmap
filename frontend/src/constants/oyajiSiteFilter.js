/** 오야지 홈 — 오늘 현장 운영 상태 필터 */

export const OYAJI_SITE_FILTER = {
  ALL: "all",
  IN_PROGRESS: "in_progress",
  SCHEDULED: "scheduled",
  DONE: "done",
  URGENT: "urgent",
};

export const OYAJI_SITE_FILTER_CHIPS = [
  { key: OYAJI_SITE_FILTER.ALL, label: "전체" },
  { key: OYAJI_SITE_FILTER.IN_PROGRESS, label: "진행" },
  { key: OYAJI_SITE_FILTER.SCHEDULED, label: "예정" },
  { key: OYAJI_SITE_FILTER.DONE, label: "완료" },
  { key: OYAJI_SITE_FILTER.URGENT, label: "긴급" },
];
