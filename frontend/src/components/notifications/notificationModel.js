/**
 * 알림 도메인 — 10종 이벤트 기반 (데모/샘플 없음)
 */

export const NOTIFICATION_TYPE = {
  CHECK_IN: "check_in",
  CHECK_OUT: "check_out",
  SCHEDULE_CREATED: "schedule_created",
  SCHEDULE_CHANGED: "schedule_changed",
  SCHEDULE_CANCELLED: "schedule_cancelled",
  SITE_INVITE: "site_invite",
  SITE_BOARD_POST: "site_board_post",
  MESSAGE_RECEIVED: "message_received",
  TEAM_JOIN_REQUEST: "team_join_request",
  TEAM_JOIN_APPROVED: "team_join_approved",
};

export const ALL_NOTIFICATION_TYPES = Object.values(NOTIFICATION_TYPE);

export const NOTIFICATION_TYPE_META = {
  [NOTIFICATION_TYPE.CHECK_IN]: { label: "출근", section: "출퇴근", icon: "🟢", priority: 0 },
  [NOTIFICATION_TYPE.CHECK_OUT]: { label: "퇴근", section: "출퇴근", icon: "🔴", priority: 0 },
  [NOTIFICATION_TYPE.SCHEDULE_CREATED]: { label: "일정 생성", section: "일정", icon: "📅", priority: 1 },
  [NOTIFICATION_TYPE.SCHEDULE_CHANGED]: { label: "일정 변경", section: "일정", icon: "✏️", priority: 1 },
  [NOTIFICATION_TYPE.SCHEDULE_CANCELLED]: { label: "일정 취소", section: "일정", icon: "🚫", priority: 1 },
  [NOTIFICATION_TYPE.SITE_INVITE]: { label: "현장 초대", section: "현장", icon: "📨", priority: 1 },
  [NOTIFICATION_TYPE.SITE_BOARD_POST]: { label: "현장 게시판", section: "현장", icon: "📋", priority: 2 },
  [NOTIFICATION_TYPE.MESSAGE_RECEIVED]: { label: "메시지", section: "메시지", icon: "💬", priority: 2 },
  [NOTIFICATION_TYPE.TEAM_JOIN_REQUEST]: { label: "팀 참여 요청", section: "팀", icon: "🙋", priority: 1 },
  [NOTIFICATION_TYPE.TEAM_JOIN_APPROVED]: { label: "팀 참여 승인", section: "팀", icon: "✅", priority: 1 },
};

export const NOTIFICATION_SETTING_OPTIONS = [
  { key: "attendance", label: "출퇴근", description: "출근 · 퇴근", types: [NOTIFICATION_TYPE.CHECK_IN, NOTIFICATION_TYPE.CHECK_OUT] },
  {
    key: "schedule",
    label: "일정",
    description: "생성 · 변경 · 취소",
    types: [NOTIFICATION_TYPE.SCHEDULE_CREATED, NOTIFICATION_TYPE.SCHEDULE_CHANGED, NOTIFICATION_TYPE.SCHEDULE_CANCELLED],
  },
  {
    key: "site",
    label: "현장",
    description: "초대 · 게시판 새 글",
    types: [NOTIFICATION_TYPE.SITE_INVITE, NOTIFICATION_TYPE.SITE_BOARD_POST],
  },
  { key: "message", label: "메시지", description: "채팅 수신", types: [NOTIFICATION_TYPE.MESSAGE_RECEIVED] },
  {
    key: "team",
    label: "팀",
    description: "참여 요청 · 승인",
    types: [NOTIFICATION_TYPE.TEAM_JOIN_REQUEST, NOTIFICATION_TYPE.TEAM_JOIN_APPROVED],
  },
];

const DEFAULT_SETTINGS = Object.fromEntries(NOTIFICATION_SETTING_OPTIONS.map((o) => [o.key, true]));

export function defaultNotificationSettings() {
  return { ...DEFAULT_SETTINGS };
}

/** @param {string} type */
export function notificationTypeToSettingsKey(type) {
  const row = NOTIFICATION_SETTING_OPTIONS.find((o) => o.types.includes(type));
  return row?.key || type;
}

/** @param {string} type */
export function sectionLabelForType(type) {
  return NOTIFICATION_TYPE_META[type]?.section || "알림";
}

/** @param {string} type */
export function notificationRowIcon(type) {
  return NOTIFICATION_TYPE_META[type]?.icon || "•";
}

/** @param {string} type */
export function labelForType(type) {
  return NOTIFICATION_TYPE_META[type]?.label || "알림";
}

/** @param {{ type?: string, kind?: string }} item */
export function normalizeNotificationType(item) {
  return item?.type || item?.kind || "";
}

/** @param {{ type?: string }} item */
export function isKnownNotificationType(item) {
  return ALL_NOTIFICATION_TYPES.includes(normalizeNotificationType(item));
}

/** @param {Record<string, boolean>} settings @param {{ type?: string }} item */
export function isNotificationTypeEnabled(settings, item) {
  const type = normalizeNotificationType(item);
  const key = notificationTypeToSettingsKey(type);
  return settings[key] !== false;
}

export function decorateNotification(item) {
  const type = normalizeNotificationType(item);
  const meta = NOTIFICATION_TYPE_META[type] || {};
  return {
    ...item,
    type,
    kind: type,
    sectionLabel: item.sectionLabel || sectionLabelForType(type),
    primaryLine: String(item.primaryLine || item.title || meta.label || "알림").trim(),
    secondaryLine: item.secondaryLine != null ? item.secondaryLine : item.body || "",
    priority: Number.isFinite(Number(item.priority)) ? Number(item.priority) : meta.priority ?? 3,
  };
}
