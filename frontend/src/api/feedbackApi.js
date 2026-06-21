import { buildApiUrl } from "./authApi";
import { getApiBaseUrl, isMockApiEnabled, mockRequest } from "./client";
import { SETTINGS_APP_VERSION } from "../constants/settingsMenuMock";
import { filesToDiscordPayload } from "../utils/feedbackImages";

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

function resolveDiscordFeedbackUrl() {
  const base = getApiBaseUrl();
  const path = "/api/feedback/discord";
  return base ? `${base}${path}` : path;
}

/**
 * 버그·의견 → Discord Webhook (Vercel `/api/feedback/discord`)
 */
export async function submitBetaFeedback({
  reportType = "FEEDBACK",
  content,
  username,
  appVersion = SETTINGS_APP_VERSION,
  categoryLabel,
  pageUrl,
  images,
}) {
  const trimmed = String(content || "").trim();
  if (!trimmed) {
    throw new Error("내용을 입력해 주세요.");
  }

  if (isMockApiEnabled()) {
    return mockRequest({
      submittedAt: new Date().toISOString(),
      reportType: reportType === "BUG" ? "BUG" : "FEEDBACK",
      channel: "discord-mock",
    });
  }

  const imagePayload = await filesToDiscordPayload(images);

  const response = await fetch(resolveDiscordFeedbackUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reportType: reportType === "BUG" ? "BUG" : "FEEDBACK",
      content: trimmed,
      username: String(username || "익명").trim() || "익명",
      appVersion,
      categoryLabel: categoryLabel || undefined,
      pageUrl: pageUrl || (typeof window !== "undefined" ? window.location.href : undefined),
      images: imagePayload,
    }),
  });

  return parseJsonResponse(response);
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

export async function fetchBetaFeedbackAdminList({ status, severity, page = 0, size = 20 } = {}) {
  if (isMockApiEnabled()) {
    return mockRequest({
      items: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
      topSimilarGroups: [],
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
