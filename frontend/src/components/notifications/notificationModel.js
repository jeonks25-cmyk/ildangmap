/**
 * 알림 도메인 — MVP 현장 알림만 (MapPlaceOverlay 카드 UI)
 */

export const NOTIFICATION_KIND = {
  SITE_REGISTERED: "site_registered",
  SITE_UPDATED: "site_updated",
  SITE_CLOSED: "site_closed",
  TEAM_DEPARTED: "team_departed",
  TEAM_ARRIVED: "team_arrived",
  SCHEDULE_TIME_CHANGE: "schedule_time_change",
  SCHEDULE_DATE_CHANGE: "schedule_date_change",
  SETTLEMENT_REVIEW: "settlement_review",
  SETTLEMENT_DONE: "settlement_done",
};

export const MVP_NOTIFICATION_KINDS = new Set(Object.values(NOTIFICATION_KIND));

/** @param {{ kind?: string, type?: string }} item */
export function isMvpNotificationKind(item) {
  const kind = item?.kind || item?.type;
  return MVP_NOTIFICATION_KINDS.has(kind);
}

/** @param {string} kind */
export function notificationKindToSettingsKey(kind) {
  const map = {
    [NOTIFICATION_KIND.SITE_REGISTERED]: "siteShare",
    [NOTIFICATION_KIND.SITE_UPDATED]: "siteShare",
    [NOTIFICATION_KIND.SITE_CLOSED]: "siteShare",
    [NOTIFICATION_KIND.TEAM_DEPARTED]: "stage",
    [NOTIFICATION_KIND.TEAM_ARRIVED]: "stage",
    [NOTIFICATION_KIND.SCHEDULE_TIME_CHANGE]: "scheduleChange",
    [NOTIFICATION_KIND.SCHEDULE_DATE_CHANGE]: "scheduleChange",
    [NOTIFICATION_KIND.SETTLEMENT_REVIEW]: "settlement",
    [NOTIFICATION_KIND.SETTLEMENT_DONE]: "settlement",
  };
  return map[kind] || kind;
}

/** @param {string} kind */
export function sectionLabelForKind(kind) {
  switch (kind) {
    case NOTIFICATION_KIND.SITE_REGISTERED:
    case NOTIFICATION_KIND.SITE_UPDATED:
    case NOTIFICATION_KIND.SITE_CLOSED:
      return "현장";
    case NOTIFICATION_KIND.TEAM_DEPARTED:
    case NOTIFICATION_KIND.TEAM_ARRIVED:
      return "팀";
    case NOTIFICATION_KIND.SCHEDULE_TIME_CHANGE:
    case NOTIFICATION_KIND.SCHEDULE_DATE_CHANGE:
      return "일정";
    case NOTIFICATION_KIND.SETTLEMENT_REVIEW:
    case NOTIFICATION_KIND.SETTLEMENT_DONE:
      return "정산";
    default:
      return "알림";
  }
}

/** @param {string} kind */
export function notificationRowIcon(kind) {
  switch (kind) {
    case NOTIFICATION_KIND.SITE_REGISTERED:
    case NOTIFICATION_KIND.SITE_UPDATED:
    case NOTIFICATION_KIND.SITE_CLOSED:
      return "🏗";
    case NOTIFICATION_KIND.TEAM_DEPARTED:
      return "🚶";
    case NOTIFICATION_KIND.TEAM_ARRIVED:
      return "📍";
    case NOTIFICATION_KIND.SCHEDULE_TIME_CHANGE:
    case NOTIFICATION_KIND.SCHEDULE_DATE_CHANGE:
      return "📅";
    case NOTIFICATION_KIND.SETTLEMENT_REVIEW:
    case NOTIFICATION_KIND.SETTLEMENT_DONE:
      return "💰";
    default:
      return "•";
  }
}

function nowIso(offsetMinutes = 0) {
  return new Date(Date.now() - offsetMinutes * 60000).toISOString();
}

/** MVP 시드 알림 */
export function buildMvpSeedNotifications() {
  return [
    {
      id: "mvp-team-arrived",
      kind: NOTIFICATION_KIND.TEAM_ARRIVED,
      sectionLabel: "팀",
      primaryLine: "김철수님 현장 도착",
      secondaryLine: "둔산동 상가 필름",
      createdAt: nowIso(3),
      priority: 0,
    },
    {
      id: "mvp-team-departed",
      kind: NOTIFICATION_KIND.TEAM_DEPARTED,
      sectionLabel: "팀",
      primaryLine: "박영희님 출발",
      secondaryLine: "관저동 설비 현장",
      createdAt: nowIso(15),
      priority: 0,
    },
    {
      id: "mvp-schedule-time",
      kind: NOTIFICATION_KIND.SCHEDULE_TIME_CHANGE,
      sectionLabel: "일정",
      primaryLine: "작업시간 변경",
      secondaryLine: "내일 07:30 → 08:30",
      createdAt: nowIso(42),
      priority: 1,
    },
    {
      id: "mvp-site-registered",
      kind: NOTIFICATION_KIND.SITE_REGISTERED,
      sectionLabel: "현장",
      primaryLine: "둔산동 상가 필름 등록됨",
      secondaryLine: "",
      createdAt: nowIso(60),
      priority: 1,
    },
    {
      id: "mvp-settlement-review",
      kind: NOTIFICATION_KIND.SETTLEMENT_REVIEW,
      sectionLabel: "정산",
      primaryLine: "정산 확인 필요",
      secondaryLine: "6/2 관저동 설비",
      createdAt: nowIso(90),
      priority: 2,
    },
    {
      id: "mvp-site-updated",
      kind: NOTIFICATION_KIND.SITE_UPDATED,
      sectionLabel: "현장",
      primaryLine: "유성구 타일 현장 수정됨",
      secondaryLine: "집결 시간 변경",
      createdAt: nowIso(120),
      priority: 2,
    },
    {
      id: "mvp-schedule-date",
      kind: NOTIFICATION_KIND.SCHEDULE_DATE_CHANGE,
      sectionLabel: "일정",
      primaryLine: "작업일 변경",
      secondaryLine: "6/5 → 6/6",
      createdAt: nowIso(180),
      priority: 2,
    },
    {
      id: "mvp-settlement-done",
      kind: NOTIFICATION_KIND.SETTLEMENT_DONE,
      sectionLabel: "정산",
      primaryLine: "정산 완료",
      secondaryLine: "5/28 둔산동 필름",
      createdAt: nowIso(240),
      priority: 3,
    },
    {
      id: "mvp-site-closed",
      kind: NOTIFICATION_KIND.SITE_CLOSED,
      sectionLabel: "현장",
      primaryLine: "서구 아파트 현장 마감됨",
      secondaryLine: "",
      createdAt: nowIso(300),
      priority: 3,
    },
  ];
}
