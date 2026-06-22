import { runApiRequest } from "./client";

export async function fetchOcrAnalyticsAdminAccess() {
  try {
    const data = await runApiRequest({ path: "/api/admin/analytics/access", method: "GET" });
    return { admin: Boolean(data?.admin) };
  } catch (_) {
    return { admin: false };
  }
}

export async function fetchOcrAnalyticsSummary(days = 30) {
  return runApiRequest({
    path: `/api/admin/analytics/ocr?days=${encodeURIComponent(String(days))}`,
    method: "GET",
  });
}
