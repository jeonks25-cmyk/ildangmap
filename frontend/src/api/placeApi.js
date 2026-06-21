import { buildApiUrl } from "./authApi";
import { isMockApiEnabled, mockRequest } from "./client";

function unwrapEnvelope(payload) {
  if (payload && typeof payload === "object" && Object.prototype.hasOwnProperty.call(payload, "data")) {
    return payload.data;
  }
  return payload;
}

async function parseJsonResponse(response) {
  const payload = await response.json();
  if (!response.ok) {
    const message =
      payload && typeof payload.message === "string" ? payload.message : "요청에 실패했습니다.";
    throw new Error(message);
  }
  return unwrapEnvelope(payload);
}

function encodePlaceId(placeId) {
  return encodeURIComponent(String(placeId || ""));
}

export async function submitPlaceReportApi(placeId, { reason, title } = {}) {
  if (isMockApiEnabled()) {
    return mockRequest({
      placeId,
      status: "ACTIVE",
      reportCount: 1,
      correctCount: 0,
      incorrectCount: 0,
      myVerifyVote: null,
      lastReportAt: new Date().toISOString(),
    });
  }
  const response = await fetch(buildApiUrl(`/api/places/${encodePlaceId(placeId)}/reports`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason, title }),
  });
  return parseJsonResponse(response);
}

export async function submitPlaceVerifyApi(placeId, vote) {
  const normalized = vote === "wrong" ? "incorrect" : vote;
  if (isMockApiEnabled()) {
    return mockRequest({
      placeId,
      status: "ACTIVE",
      reportCount: 0,
      correctCount: normalized === "correct" ? 1 : 0,
      incorrectCount: normalized === "incorrect" ? 1 : 0,
      myVerifyVote: normalized,
    });
  }
  const response = await fetch(buildApiUrl(`/api/places/${encodePlaceId(placeId)}/verify`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vote: normalized }),
  });
  return parseJsonResponse(response);
}

export async function fetchPlaceModerationApi(placeId) {
  if (isMockApiEnabled()) {
    return mockRequest({
      placeId,
      status: "ACTIVE",
      reportCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      myVerifyVote: null,
    });
  }
  const response = await fetch(buildApiUrl(`/api/places/${encodePlaceId(placeId)}/moderation`), {
    method: "GET",
    credentials: "include",
  });
  return parseJsonResponse(response);
}

export async function fetchPlaceModerationStatusIndexApi() {
  if (isMockApiEnabled()) {
    return mockRequest({});
  }
  const response = await fetch(buildApiUrl("/api/places/moderation/status-index"), {
    method: "GET",
    credentials: "include",
  });
  return parseJsonResponse(response);
}

export async function fetchPlaceReportsAdminApi({ sort = "reports" } = {}) {
  if (isMockApiEnabled()) {
    return mockRequest({
      stats: { totalPlaces: 0, pendingReview: 0, hidden: 0, deleteCandidate: 0 },
      items: [],
    });
  }
  const params = new URLSearchParams({ sort });
  const response = await fetch(buildApiUrl(`/api/admin/place-reports?${params}`), {
    method: "GET",
    credentials: "include",
  });
  return parseJsonResponse(response);
}

export async function updatePlaceStatusAdminApi(placeId, status) {
  if (isMockApiEnabled()) {
    return mockRequest({ placeId, status });
  }
  const response = await fetch(buildApiUrl(`/api/admin/places/${encodePlaceId(placeId)}/status`), {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return parseJsonResponse(response);
}

export async function deletePlaceAdminApi(placeId) {
  if (isMockApiEnabled()) {
    return mockRequest({ placeId, status: "HIDDEN" });
  }
  const response = await fetch(buildApiUrl(`/api/admin/places/${encodePlaceId(placeId)}`), {
    method: "DELETE",
    credentials: "include",
  });
  return parseJsonResponse(response);
}
