import { PLACE_MODERATION_STATUS } from "../constants/placeModeration";
import {
  cacheModerationRecord,
  formatModerationStatusLabel,
  getPlaceModerationRecord,
  resolveAutoModerationStatus,
} from "./placeModeration";

export function recordPlaceReport(placeKey, { reason = "", title = "", mapItemId = "", source = "place" } = {}) {
  if (!placeKey) return { reportCount: 0, moderationStatus: PLACE_MODERATION_STATUS.PUBLIC };

  const prev = getPlaceModerationRecord(placeKey);
  const reportCount = (Number(prev.reportCount) || 0) + 1;
  const at = new Date().toISOString();
  const nextStatus = prev.adminLocked
    ? prev.moderationStatus
    : resolveAutoModerationStatus(reportCount, prev.moderationStatus);

  const record = cacheModerationRecord(placeKey, {
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
  });

  return { reportCount, moderationStatus: nextStatus, record };
}

export function recordPlaceVerifyVote(placeKey, userId, vote, { title = "", mapItemId = "" } = {}) {
  if (!placeKey || !userId || (vote !== "correct" && vote !== "wrong")) {
    return getPlaceModerationRecord(placeKey);
  }

  const prev = getPlaceModerationRecord(placeKey);
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
  if (!prev.adminLocked && wrongCount >= 3 && wrongCount > correctCount) {
    if (
      moderationStatus === PLACE_MODERATION_STATUS.PUBLIC &&
      (Number(prev.reportCount) || 0) < 3
    ) {
      moderationStatus = PLACE_MODERATION_STATUS.PENDING_REVIEW;
    }
  }

  return cacheModerationRecord(placeKey, {
    ...prev,
    correctCount,
    wrongCount,
    verifyVotes,
    moderationStatus,
    title: title || prev.title,
    mapItemId: mapItemId || prev.mapItemId,
  });
}

export function adminSetPlaceModerationStatus(placeKey, status, { lock = true } = {}) {
  if (!placeKey) return null;
  return cacheModerationRecord(placeKey, {
    ...getPlaceModerationRecord(placeKey),
    moderationStatus: status,
    adminLocked: lock,
  });
}

export function listPlaceModerationForAdmin() {
  const store = JSON.parse(localStorage.getItem("ildangmap_place_moderation_v1") || '{"places":{}}');
  const places = store.places || {};
  return Object.entries(places)
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
