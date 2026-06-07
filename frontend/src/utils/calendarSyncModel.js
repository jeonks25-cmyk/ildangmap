/**
 * 외부 캘린더 연동 설정 — API 어댑터 연결 전 MVP 상태 관리
 */
import { CALENDAR_EVENT_SOURCE } from "./calendarEventModel";

export const CALENDAR_SYNC_STATUS = {
  DISCONNECTED: "disconnected",
  READY: "ready",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  ERROR: "error",
};

const STORAGE_KEY = "ildangmap.calendarSync.v1";

/** @typedef {'google'|'naver'|'ios'} CalendarSyncProviderId */

/**
 * @typedef {Object} CalendarSyncProvider
 * @property {CalendarSyncProviderId} id
 * @property {import('./calendarEventModel').CalendarEventSource} source
 * @property {string} label
 * @property {string} description
 * @property {string} icon
 * @property {boolean} apiReady MVP: false until backend/oauth wired
 */

export const CALENDAR_SYNC_PROVIDERS = [
  {
    id: "google",
    source: CALENDAR_EVENT_SOURCE.GOOGLE,
    label: "Google Calendar",
    description: "구글 계정 일정을 가져오고보냅니다.",
    icon: "G",
    apiReady: false,
  },
  {
    id: "naver",
    source: CALENDAR_EVENT_SOURCE.NAVER,
    label: "네이버 캘린더",
    description: "네이버 일정과 양방향으로 맞춥니다.",
    icon: "N",
    apiReady: false,
  },
  {
    id: "ios",
    source: CALENDAR_EVENT_SOURCE.IOS,
    label: "Apple Calendar",
    description: "iPhone·iPad 캘린더와 연동합니다.",
    icon: "\uF8FF",
    apiReady: false,
  },
];

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
}

function writeStore(next) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (_) {
    /* ignore quota */
  }
}

export function loadCalendarSyncConnections() {
  const stored = readStore();
  return CALENDAR_SYNC_PROVIDERS.map((provider) => {
    const saved = stored[provider.id] || {};
    const status = saved.status || CALENDAR_SYNC_STATUS.DISCONNECTED;
    return {
      ...provider,
      status,
      lastSyncedAt: saved.lastSyncedAt || "",
      accountLabel: saved.accountLabel || "",
    };
  });
}

export function saveCalendarSyncConnection(providerId, patch = {}) {
  const stored = readStore();
  stored[providerId] = {
    ...(stored[providerId] || {}),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  writeStore(stored);
  return loadCalendarSyncConnections();
}

export function getCalendarSyncStatusLabel(status) {
  switch (status) {
    case CALENDAR_SYNC_STATUS.CONNECTED:
      return "연동됨";
    case CALENDAR_SYNC_STATUS.CONNECTING:
      return "연결 중";
    case CALENDAR_SYNC_STATUS.READY:
      return "준비됨";
    case CALENDAR_SYNC_STATUS.ERROR:
      return "오류";
    default:
      return "미연동";
  }
}

/**
 * 향후 OAuth/API 어댑터 진입점
 * @param {CalendarSyncProviderId} providerId
 */
export async function requestCalendarSyncConnect(providerId) {
  const provider = CALENDAR_SYNC_PROVIDERS.find((p) => p.id === providerId);
  if (!provider) {
    return { ok: false, reason: "unknown_provider" };
  }
  if (!provider.apiReady) {
    saveCalendarSyncConnection(providerId, { status: CALENDAR_SYNC_STATUS.READY });
    return { ok: false, reason: "api_not_ready", provider };
  }
  saveCalendarSyncConnection(providerId, { status: CALENDAR_SYNC_STATUS.CONNECTING });
  return { ok: true, provider };
}

export function disconnectCalendarSync(providerId) {
  saveCalendarSyncConnection(providerId, {
    status: CALENDAR_SYNC_STATUS.DISCONNECTED,
    accountLabel: "",
    lastSyncedAt: "",
  });
}
