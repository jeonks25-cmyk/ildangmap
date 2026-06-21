import { buildApiUrl } from "./authApi";
import { getApiBaseUrl, isMockApiEnabled, mockRequest } from "./client";

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

export async function fetchFeedbackAdminAccess() {
  if (isMockApiEnabled()) {
    return mockRequest({ admin: true });
  }
  const response = await fetch(buildApiUrl("/api/feedback/admin/access"), {
    method: "GET",
    credentials: "include",
  });
  return parseJsonResponse(response);
}

export async function submitBetaFeedback({ category, severity, inconvenient, featureRequest, otherComment, images }) {
  if (isMockApiEnabled()) {
    return mockRequest({ id: Date.now(), status: "NEW", createdAt: new Date().toISOString() });
  }

  const formData = new FormData();
  formData.append("category", category);
  formData.append("severity", severity);
  if (inconvenient) formData.append("inconvenient", inconvenient);
  if (featureRequest) formData.append("featureRequest", featureRequest);
  if (otherComment) formData.append("otherComment", otherComment);
  (images || []).forEach((file) => formData.append("images", file));

  const response = await fetch(buildApiUrl("/api/feedback"), {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  return parseJsonResponse(response);
}

export async function fetchBetaFeedbackAdminList({ status, severity, page = 0, size = 20 } = {}) {
  if (isMockApiEnabled()) {
    return mockRequest({
      items: [
        {
          id: 1,
          userId: 2,
          displayNickname: "베타테스터",
          userType: "OYAJI",
          category: "MAP",
          severity: "CRITICAL",
          status: "NEW",
          inconvenient: "지도가 느려요",
          featureRequest: null,
          otherComment: null,
          similarCount: 3,
          similarityGroupKey: "MAP:abc",
          createdAt: new Date().toISOString(),
          attachments: [],
        },
      ],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
      topSimilarGroups: [{ similarityGroupKey: "MAP:abc", count: 3 }],
    });
  }

  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) params.set("status", status);
  if (severity) params.set("severity", severity);

  const response = await fetch(buildApiUrl(`/api/feedback/admin?${params}`), {
    method: "GET",
    credentials: "include",
  });
  return parseJsonResponse(response);
}

export async function updateBetaFeedbackStatus(feedbackId, status) {
  if (isMockApiEnabled()) {
    return mockRequest({ id: feedbackId, status });
  }
  const response = await fetch(buildApiUrl(`/api/feedback/admin/${feedbackId}/status`), {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return parseJsonResponse(response);
}

export function buildFeedbackAttachmentUrl(pathOrId) {
  if (typeof pathOrId === "string" && pathOrId.startsWith("/")) {
    const base = getApiBaseUrl();
    if (!base) return pathOrId;
    return `${base}${pathOrId}`;
  }
  return buildApiUrl(`/api/feedback/attachments/${pathOrId}`);
}
