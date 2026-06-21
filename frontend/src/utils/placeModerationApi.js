import { PLACE_MODERATION_STATUS } from "../constants/placeModeration";

const SERVER_STATUS_TO_LOCAL = {
  ACTIVE: PLACE_MODERATION_STATUS.PUBLIC,
  PENDING_REVIEW: PLACE_MODERATION_STATUS.PENDING_REVIEW,
  HIDDEN: PLACE_MODERATION_STATUS.HIDDEN,
  DELETE_CANDIDATE: PLACE_MODERATION_STATUS.DELETE_CANDIDATE,
};

const LOCAL_STATUS_TO_SERVER = {
  [PLACE_MODERATION_STATUS.PUBLIC]: "ACTIVE",
  [PLACE_MODERATION_STATUS.PENDING_REVIEW]: "PENDING_REVIEW",
  [PLACE_MODERATION_STATUS.HIDDEN]: "HIDDEN",
  [PLACE_MODERATION_STATUS.DELETE_CANDIDATE]: "DELETE_CANDIDATE",
};

export function mapServerModerationStatus(status) {
  if (!status) return PLACE_MODERATION_STATUS.PUBLIC;
  const key = String(status).toUpperCase();
  return SERVER_STATUS_TO_LOCAL[key] || PLACE_MODERATION_STATUS.PUBLIC;
}

export function mapLocalModerationStatusToServer(status) {
  return LOCAL_STATUS_TO_SERVER[status] || "ACTIVE";
}

export function mapServerVerifyVote(vote) {
  if (!vote) return null;
  const normalized = String(vote).toLowerCase();
  if (normalized === "correct") return "correct";
  if (normalized === "incorrect" || normalized === "wrong") return "wrong";
  return null;
}

export function normalizeServerModeration(placeKey, payload = {}, userId = null) {
  const moderationStatus = mapServerModerationStatus(payload.status);
  const myVote = mapServerVerifyVote(payload.myVerifyVote);
  const verifyVotes = {};
  if (userId && myVote) {
    verifyVotes[userId] = myVote;
  }
  return {
    reportCount: Number(payload.reportCount) || 0,
    moderationStatus,
    correctCount: Number(payload.correctCount) || 0,
    wrongCount: Number(payload.incorrectCount) || 0,
    verifyVotes,
    adminLocked: false,
    title: payload.title || "",
    mapItemId: "",
    placeKey: payload.placeId || placeKey,
    lastReportAt: payload.lastReportAt || "",
    updatedAt: new Date().toISOString(),
  };
}

export function mapAdminItemToRow(item) {
  return {
    placeKey: item.placeId,
    title: item.title || item.placeId,
    moderationStatus: mapServerModerationStatus(item.status),
    reportCount: Number(item.reportCount) || 0,
    correctCount: Number(item.correctCount) || 0,
    wrongCount: Number(item.incorrectCount) || 0,
    latestReason: item.latestReason || "—",
    lastReportAt: item.lastReportAt || "",
    mapItemId: "",
  };
}
