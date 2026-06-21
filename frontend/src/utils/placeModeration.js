import { getMapItemKey } from "./mapItemModel";
import {
  PLACE_MODERATION_STATUS,
  PLACE_MODERATION_STATUS_LABEL,
  PLACE_REPORT_THRESHOLDS,
  PLACE_VERIFY_REVIEW_MIN_WRONG,
} from "../constants/placeModeration";

const MODERATION_STORAGE_KEY = "ildangmap_place_moderation_v1";
const LEGACY_REPORTS_KEY = "ildangmap_place_reports_v1";

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {
    /* noop */
  }
}

function emptyRecord() {
  return {
    reportCount: 0,
    reports: [],
    moderationStatus: PLACE_MODERATION_STATUS.PUBLIC,
    correctCount: 0,
    wrongCount: 0,
    verifyVotes: {},
    adminLocked: false,
    title: "",
    mapItemId: "",
    lastReportAt: "",
    updatedAt: "",
  };
}

function readStore() {
  migrateLegacyReports();
  const data = readJson(MODERATION_STORAGE_KEY, { places: {} });
  if (!data.places || typeof data.places !== "object") return { places: {} };
  return data;
}

function writeStore(store) {
  writeJson(MODERATION_STORAGE_KEY, store);
}

function migrateLegacyReports() {
  if (localStorage.getItem(MODERATION_STORAGE_KEY)) return;
  const legacy = readJson(LEGACY_REPORTS_KEY, {});
  if (!legacy || typeof legacy !== "object" || !Object.keys(legacy).length) return;
  const store = { places: {} };
  Object.entries(legacy).forEach(([placeKey, count]) => {
    const reportCount = Number(count) || 0;
    if (reportCount <= 0) return;
    store.places[placeKey] = {
      ...emptyRecord(),
      reportCount,
      moderationStatus: resolveAutoModerationStatus(reportCount),
      updatedAt: new Date().toISOString(),
    };
  });
  writeStore(store);
}

export function resolveAutoModerationStatus(reportCount, currentStatus = PLACE_MODERATION_STATUS.PUBLIC) {
  const count = Number(reportCount) || 0;
  if (currentStatus === PLACE_MODERATION_STATUS.DELETED) return PLACE_MODERATION_STATUS.DELETED;
  if (count >= PLACE_REPORT_THRESHOLDS.DELETE_CANDIDATE) return PLACE_MODERATION_STATUS.DELETE_CANDIDATE;
  if (count >= PLACE_REPORT_THRESHOLDS.AUTO_HIDE) return PLACE_MODERATION_STATUS.HIDDEN;
  if (count >= PLACE_REPORT_THRESHOLDS.PENDING_REVIEW) return PLACE_MODERATION_STATUS.PENDING_REVIEW;
  return PLACE_MODERATION_STATUS.PUBLIC;
}

export function needsVerifyReview(correctCount, wrongCount) {
  const correct = Number(correctCount) || 0;
  const wrong = Number(wrongCount) || 0;
  return wrong >= PLACE_VERIFY_REVIEW_MIN_WRONG && wrong > correct;
}

export function getPlaceModerationRecord(placeKey) {
  if (!placeKey) return emptyRecord();
  const store = readStore();
  return { ...emptyRecord(), ...(store.places[placeKey] || {}) };
}

export function getPlaceReportCount(placeKey) {
  return getPlaceModerationRecord(placeKey).reportCount;
}

export function getPlaceModerationStatus(placeKey) {
  return getPlaceModerationRecord(placeKey).moderationStatus;
}

export function needsPlaceReview(placeKey) {
  const record = getPlaceModerationRecord(placeKey);
  return (
    record.moderationStatus === PLACE_MODERATION_STATUS.PENDING_REVIEW ||
    record.moderationStatus === PLACE_MODERATION_STATUS.DELETE_CANDIDATE ||
    needsVerifyReview(record.correctCount, record.wrongCount)
  );
}

export function isMapPlaceVisible(placeKey, item = null) {
  const status =
    item?.sourceMeta?.moderationStatus ||
    item?.moderationStatus ||
    getPlaceModerationStatus(placeKey);
  return (
    status !== PLACE_MODERATION_STATUS.HIDDEN &&
    status !== PLACE_MODERATION_STATUS.DELETED &&
    status !== PLACE_MODERATION_STATUS.DELETE_CANDIDATE
  );
}

export function formatModerationStatusLabel(status) {
  return PLACE_MODERATION_STATUS_LABEL[status] || status || "공개";
}

export function buildReportFeedbackMessage(reportCount, moderationStatus) {
  const count = Number(reportCount) || 0;
  const status = moderationStatus || resolveAutoModerationStatus(count);
  const lines = [
    "🚨 신고가 접수되었습니다.",
    "",
    "신고 3회 이상 누적 시 자동 검수 대상으로 전환됩니다.",
    `현재 누적 신고: ${count}건`,
  ];
  if (status === PLACE_MODERATION_STATUS.PENDING_REVIEW) {
    lines.push("이 장소는 검수 대기 상태입니다.");
  } else if (status === PLACE_MODERATION_STATUS.HIDDEN) {
    lines.push("신고 5회 이상으로 지도에서 숨김 처리되었습니다.");
  } else if (status === PLACE_MODERATION_STATUS.DELETE_CANDIDATE) {
    lines.push("신고 10회 이상 — 삭제 후보 상태입니다.");
  }
  return lines.join("\n");
}

export function recordPlaceReport(placeKey, { reason = "", title = "", mapItemId = "", source = "place" } = {}) {
  if (!placeKey) return { reportCount: 0, moderationStatus: PLACE_MODERATION_STATUS.PUBLIC };

  const store = readStore();
  const prev = { ...emptyRecord(), ...(store.places[placeKey] || {}) };
  const reportCount = (Number(prev.reportCount) || 0) + 1;
  const at = new Date().toISOString();
  const nextStatus = prev.adminLocked
    ? prev.moderationStatus
    : resolveAutoModerationStatus(reportCount, prev.moderationStatus);

  store.places[placeKey] = {
    ...prev,
    reportCount,
    reports: [{ id: `r-${Date.now()}`, reason, at, source }, ...(Array.isArray(prev.reports) ? prev.reports : [])].slice(
      0,
      50
    ),
    moderationStatus: nextStatus,
    title: title || prev.title,
    mapItemId: mapItemId || prev.mapItemId,
    lastReportAt: at,
    updatedAt: at,
  };
  writeStore(store);

  return { reportCount, moderationStatus: nextStatus, record: store.places[placeKey] };
}

export function recordPlaceVerifyVote(placeKey, userId, vote, { title = "", mapItemId = "" } = {}) {
  if (!placeKey || !userId || (vote !== "correct" && vote !== "wrong")) {
    return getPlaceModerationRecord(placeKey);
  }

  const store = readStore();
  const prev = { ...emptyRecord(), ...(store.places[placeKey] || {}) };
  const verifyVotes = { ...(prev.verifyVotes || {}) };
  const previousVote = verifyVotes[userId] || null;

  let correctCount = Number(prev.correctCount) || 0;
  let wrongCount = Number(prev.wrongCount) || 0;

  if (previousVote === "correct") correctCount = Math.max(0, correctCount - 1);
  if (previousVote === "wrong") wrongCount = Math.max(0, wrongCount - 1);
  if (vote === "correct") correctCount += 1;
  if (vote === "wrong") wrongCount += 1;

  verifyVotes[userId] = vote;

  let moderationStatus = prev.moderationStatus;
  if (!prev.adminLocked && needsVerifyReview(correctCount, wrongCount)) {
    if (
      moderationStatus === PLACE_MODERATION_STATUS.PUBLIC &&
      (Number(prev.reportCount) || 0) < PLACE_REPORT_THRESHOLDS.PENDING_REVIEW
    ) {
      moderationStatus = PLACE_MODERATION_STATUS.PENDING_REVIEW;
    }
  }

  store.places[placeKey] = {
    ...prev,
    correctCount,
    wrongCount,
    verifyVotes,
    moderationStatus,
    title: title || prev.title,
    mapItemId: mapItemId || prev.mapItemId,
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);
  return store.places[placeKey];
}

export function getUserVerifyVote(placeKey, userId) {
  if (!placeKey || !userId) return null;
  const votes = getPlaceModerationRecord(placeKey).verifyVotes || {};
  const vote = votes[userId];
  return vote === "correct" || vote === "wrong" ? vote : null;
}

export function adminSetPlaceModerationStatus(placeKey, status, { lock = true } = {}) {
  if (!placeKey) return null;
  const store = readStore();
  const prev = { ...emptyRecord(), ...(store.places[placeKey] || {}) };
  store.places[placeKey] = {
    ...prev,
    moderationStatus: status,
    adminLocked: lock,
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);
  return store.places[placeKey];
}

export function listPlaceModerationForAdmin() {
  const store = readStore();
  return Object.entries(store.places)
    .map(([placeKey, record]) => ({
      placeKey,
      ...record,
      statusLabel: formatModerationStatusLabel(record.moderationStatus),
      latestReason: record.reports?.[0]?.reason || "—",
    }))
    .filter((row) => (Number(row.reportCount) || 0) > 0 || row.moderationStatus !== PLACE_MODERATION_STATUS.PUBLIC)
    .sort((a, b) => {
      const countDiff = (Number(b.reportCount) || 0) - (Number(a.reportCount) || 0);
      if (countDiff !== 0) return countDiff;
      return String(b.lastReportAt || "").localeCompare(String(a.lastReportAt || ""));
    });
}

export function syncMapItemModerationMeta(item) {
  if (!item) return item;
  const placeKey = getMapItemKey(item);
  const record = getPlaceModerationRecord(placeKey);
  return {
    ...item,
    sourceMeta: {
      ...(item.sourceMeta || {}),
      reportCount: record.reportCount,
      moderationStatus: record.moderationStatus,
      correctCount: record.correctCount,
      wrongCount: record.wrongCount,
    },
  };
}

/**
 * 장기 계획 — 등록자 신뢰도 (백엔드 연동 전 설계용)
 * @returns {number} 0~100
 */
export function computeCreatorTrustScore({ registeredCount = 0, deletedCount = 0, reportRate = 0 } = {}) {
  const registered = Math.max(0, Number(registeredCount) || 0);
  const deleted = Math.max(0, Number(deletedCount) || 0);
  const rate = Math.min(1, Math.max(0, Number(reportRate) || 0));
  if (registered === 0) return 50;
  const deletionPenalty = (deleted / registered) * 35;
  const reportPenalty = rate * 40;
  const volumeBonus = Math.min(15, registered * 0.5);
  return Math.round(Math.max(0, Math.min(100, 70 + volumeBonus - deletionPenalty - reportPenalty)));
}

/** 신뢰도 80+ 즉시 공개, 50 미만 검수 후 공개 (향후 연동) */
export function shouldAutoPublishPlace(trustScore) {
  const score = Number(trustScore) || 0;
  if (score >= 80) return true;
  if (score < 50) return false;
  return true;
}
