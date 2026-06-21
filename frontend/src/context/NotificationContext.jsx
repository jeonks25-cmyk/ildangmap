import { useCallback, useMemo } from "react";
import { useJobs } from "./JobsContext";
import { useSchedules } from "./ScheduleContext";
import { useUiStore } from "../store/useUiStore";
import { useFieldScheduleChangeStore } from "../store/useFieldScheduleChangeStore";
import { useSettlementStore } from "../store/useSettlementStore";
import {
  buildMvpSeedNotifications,
  isMvpNotificationKind,
  NOTIFICATION_KIND,
  notificationKindToSettingsKey,
  sectionLabelForKind,
} from "../components/notifications/notificationModel";
import { buildFieldJobTitle, getWorkerStage, WORKER_STAGE } from "../utils/jobModel";
import { SCHEDULE_SETTLEMENT_STATUS } from "../utils/scheduleModel";

const DEFAULT_SETTINGS = {
  scheduleChange: true,
  siteShare: true,
  approval: true,
  urgent: true,
  briefing: true,
  estimate: true,
  dm: true,
  /** @deprecated persisted keys */
  help: true,
  stage: true,
  settlement: true,
  favorite: true,
  schedule: true,
};

export const NOTIFICATION_SETTING_OPTIONS = [
  { key: "siteShare", label: "현장", description: "현장 등록·수정·마감" },
  { key: "stage", label: "팀", description: "출발·현장 도착" },
  { key: "scheduleChange", label: "일정", description: "작업시간·작업일 변경" },
  { key: "settlement", label: "정산", description: "정산 확인·완료" },
];

function legacyTypeToKind(type) {
  const map = {
    stage: NOTIFICATION_KIND.TEAM_DEPARTED,
    settlement: NOTIFICATION_KIND.SETTLEMENT_REVIEW,
    scheduleChange: NOTIFICATION_KIND.SCHEDULE_TIME_CHANGE,
    schedule: NOTIFICATION_KIND.SCHEDULE_DATE_CHANGE,
    siteShare: NOTIFICATION_KIND.SITE_REGISTERED,
  };
  return map[type] || type;
}

function decorateNotification(item) {
  const kind = item.kind || legacyTypeToKind(item.type);
  const sectionLabel = item.sectionLabel || sectionLabelForKind(kind);
  return {
    ...item,
    kind,
    sectionLabel,
    primaryLine: item.primaryLine || item.title || "",
    secondaryLine: item.secondaryLine != null ? item.secondaryLine : item.description || "",
    needsAvailabilityResponse: Boolean(item.needsAvailabilityResponse),
  };
}

function isNotificationTypeEnabled(settings, item) {
  const kind = item.kind || legacyTypeToKind(item.type);
  const key = notificationKindToSettingsKey(kind);
  return settings[key] !== false;
}

function nowIso(offsetMinutes = 0) {
  return new Date(Date.now() - offsetMinutes * 60000).toISOString();
}

function formatRelativeTime(iso, now = new Date()) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "방금 전";
  const diffMinutes = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60000));
  if (diffMinutes < 1) return "방금 전";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}일 전`;
}

function formatMonthDay(dateKey) {
  const date = new Date(dateKey);
  if (Number.isNaN(date.getTime())) return "오늘";
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function buildNotifications({ jobs, schedules }) {
  const sourceJobs = Array.isArray(jobs) ? jobs.filter(Boolean) : [];
  const sourceSchedules = Array.isArray(schedules) ? schedules.filter(Boolean) : [];
  const teamNames = ["김철수", "박영희", "이민수"];

  const teamNotifications = sourceJobs
    .map((job, index) => ({ job, index, stage: getWorkerStage(job) }))
    .filter((item) => item.stage === WORKER_STAGE.DEPARTED || item.stage === WORKER_STAGE.ARRIVED)
    .slice(0, 3)
    .map(({ job, index, stage }) => {
      const name = teamNames[index % teamNames.length];
      const arrived = stage === WORKER_STAGE.ARRIVED;
      return {
        id: job?.id != null ? `team-${job.id}-${stage}` : `team-${index}-${stage}`,
        kind: arrived ? NOTIFICATION_KIND.TEAM_ARRIVED : NOTIFICATION_KIND.TEAM_DEPARTED,
        sectionLabel: "팀",
        primaryLine: arrived ? `${name}님 현장 도착` : `${name}님 출발`,
        secondaryLine: buildFieldJobTitle(job),
        createdAt: nowIso(arrived ? 3 + index * 5 : 15 + index * 8),
        priority: 0,
      };
    });

  const siteNotifications = sourceJobs.slice(0, 2).map((job, index) => ({
    id: job?.id != null ? `site-reg-${job.id}` : `site-reg-${index}`,
    kind: NOTIFICATION_KIND.SITE_REGISTERED,
    sectionLabel: "현장",
    primaryLine: `${buildFieldJobTitle(job)} 등록됨`,
    secondaryLine: job.shortRegion || "",
    createdAt: job.postedAt || nowIso(60 + index * 30),
    priority: 1,
  }));

  const scheduleNotifications = sourceSchedules.slice(0, 2).map((schedule, index) => ({
    id: schedule?.id != null ? `sched-${schedule.id}` : `sched-${index}`,
    kind: index === 0 ? NOTIFICATION_KIND.SCHEDULE_TIME_CHANGE : NOTIFICATION_KIND.SCHEDULE_DATE_CHANGE,
    sectionLabel: "일정",
    primaryLine: index === 0 ? "작업시간 변경" : "작업일 변경",
    secondaryLine: `${schedule.title} · ${formatMonthDay(schedule.workDate)}`,
    createdAt: nowIso(42 + index * 50),
    priority: 1,
  }));

  const settlementNotifications = sourceSchedules
    .filter(
      (schedule) =>
        schedule?.settlementStatus === SCHEDULE_SETTLEMENT_STATUS.SETTLED ||
        schedule?.settlementStatus === SCHEDULE_SETTLEMENT_STATUS.REVIEW
    )
    .slice(0, 2)
    .map((schedule, index) => {
      const isDone = schedule.settlementStatus === SCHEDULE_SETTLEMENT_STATUS.SETTLED;
      return {
        id: schedule?.id != null ? `settlement-${schedule.id}` : `settlement-${index}`,
        kind: isDone ? NOTIFICATION_KIND.SETTLEMENT_DONE : NOTIFICATION_KIND.SETTLEMENT_REVIEW,
        sectionLabel: "정산",
        primaryLine: isDone ? "정산 완료" : "정산 확인 필요",
        secondaryLine: `${formatMonthDay(schedule.workDate)} ${schedule.title}`,
        createdAt: nowIso(90 + index * 40),
        priority: 2,
      };
    });

  const seen = new Set();
  return [...teamNotifications, ...buildMvpSeedNotifications(), ...siteNotifications, ...scheduleNotifications, ...settlementNotifications]
    .filter((item) => {
      if (!isMvpNotificationKind(item)) return false;
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
}

export function NotificationProvider({ children }) {
  return children;
}

export function useNotifications() {
  const { jobs } = useJobs();
  const { schedules } = useSchedules();
  const open = useUiStore((state) => state.notificationOpen);
  const view = useUiStore((state) => state.notificationView);
  const readIds = useUiStore((state) => state.notificationReadIds);
  const notificationSettings = useUiStore((state) => state.notificationSettings);
  const openCenter = useUiStore((state) => state.openNotificationCenter);
  const closeCenter = useUiStore((state) => state.closeNotificationCenter);
  const openSettings = useUiStore((state) => state.openNotificationSettings);
  const backToCenter = useUiStore((state) => state.backToNotificationCenter);
  const toggleRead = useUiStore((state) => state.toggleNotificationRead);
  const markAllNotificationsRead = useUiStore((state) => state.markAllNotificationsRead);
  const toggleSetting = useUiStore((state) => state.toggleNotificationSetting);

  const settings = useMemo(
    () => ({ ...DEFAULT_SETTINGS, ...(notificationSettings || {}) }),
    [notificationSettings]
  );

  const availabilityByNotificationId = useFieldScheduleChangeStore((s) => s.availabilityByNotificationId);
  const respondScheduleChangeStore = useFieldScheduleChangeStore((s) => s.respondScheduleChange);
  const respondScheduleInviteStore = useSettlementStore((s) => s.respondScheduleInvite);

  const notifications = useMemo(() => {
    const raw = buildNotifications({ jobs, schedules });
    return raw.map((item) => {
      const decorated = decorateNotification(item);
      const responded = availabilityByNotificationId[decorated.id];
      if (decorated.needsAvailabilityResponse && responded) {
        return {
          ...decorated,
          needsAvailabilityResponse: false,
          availabilityResponse: responded,
        };
      }
      return decorated;
    });
  }, [availabilityByNotificationId, jobs, schedules]);

  const visibleNotifications = useMemo(
    () => notifications.filter((item) => isMvpNotificationKind(item) && isNotificationTypeEnabled(settings, item)),
    [notifications, settings]
  );

  const unreadCount = useMemo(
    () => visibleNotifications.filter((item) => !readIds.includes(item.id)).length,
    [readIds, visibleNotifications]
  );

  const respondScheduleChange = useCallback(
    ({ notificationId, siteId, available }) => {
      respondScheduleChangeStore({ notificationId, siteId, available });
      if (notificationId && !readIds.includes(notificationId)) toggleRead(notificationId);
    },
    [readIds, respondScheduleChangeStore, toggleRead]
  );

  const respondScheduleInvite = useCallback(
    ({ scheduleId, userId, available }) => {
      respondScheduleInviteStore({ scheduleId, userId, available });
    },
    [respondScheduleInviteStore]
  );

  return {
    open,
    view,
    notifications: visibleNotifications.map((item) => ({
      ...item,
      timeLabel: formatRelativeTime(item.createdAt, new Date()),
      isRead: readIds.includes(item.id),
    })),
    settings,
    unreadCount,
    openCenter,
    closeCenter,
    openSettings,
    backToCenter,
    toggleRead,
    markAllRead: () => markAllNotificationsRead(visibleNotifications.map((item) => item.id)),
    toggleSetting,
    respondScheduleChange,
    respondScheduleInvite,
  };
}
