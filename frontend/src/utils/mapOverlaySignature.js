/**
 * 지도 overlay diff — 운영 필드 변경 시 HTML 갱신 (id-only stale 방지)
 */
import { getQuoteMapDisplayKind } from "../constants/quoteMapDisplay";
import { normalizeQuoteStatus } from "../constants/quoteStatus";
import { getEstimateSupporterCount } from "./estimateRequestModel";
import { enrichJobFieldFlow } from "./fieldFlowModel";
import { getJobManpowerCounts, isAfternoonJoinJob, isOyajiUrgentJob } from "./oyajiSiteModel";
import { migrateJob, normalizeLifecycleStatus } from "./jobModel";

/** 단일 job overlay content fingerprint */
export function buildJobMarkerContentKey(job, markerMode = "pin", overlayDensity = "compact") {
  if (!job?.id) return "";
  const j = enrichJobFieldFlow(migrateJob(job));
  const { confirmed, required, shortage } = getJobManpowerCounts(j);
  const st = normalizeLifecycleStatus(j);
  const lat = Number(j.lat);
  const lng = Number(j.lng);
  const urgent = isOyajiUrgentJob(j) ? 1 : 0;
  const afternoon = isAfternoonJoinJob(j) ? 1 : 0;
  const modeKey = markerMode === "ops" ? `ops-${overlayDensity}` : markerMode;
  return [
    j.id,
    modeKey,
    st,
    j.flowKind || "",
    `${confirmed}/${required}`,
    shortage,
    urgent,
    afternoon,
    Number.isFinite(lat) ? lat.toFixed(5) : "",
    Number.isFinite(lng) ? lng.toFixed(5) : "",
  ].join(":");
}

/** @returns {'compact'|'minimal'|'hidden'} */
export function resolveMapOverlayDensity(mapLevel) {
  const lv = Number(mapLevel);
  if (!Number.isFinite(lv) || lv >= 8) return "hidden";
  if (lv >= 6) return "minimal";
  return "compact";
}

export function buildJobsOverlaySignature(jobs, markerMode = "pin", overlayDensity = "compact") {
  const list = Array.isArray(jobs) ? jobs : [];
  const parts = list
    .map((j) => buildJobMarkerContentKey(j, markerMode, overlayDensity))
    .filter(Boolean)
    .sort((a, b) => String(a).localeCompare(String(b)));
  const modeKey = markerMode === "ops" ? `ops-${overlayDensity}` : markerMode;
  return `${list.length}:${modeKey}:${parts.join("|")}`;
}
export function buildEstimateMarkerContentKey(request) {
  if (!request?.id) return "";
  const status = normalizeQuoteStatus(request);
  const display = getQuoteMapDisplayKind(request) || "";
  const supporters = getEstimateSupporterCount(request);
  const badge = request?.isNewToday ? "n" : "";
  return `${request.id}:${status}:${display}:${supporters}${badge}`;
}

export function buildEstimatesOverlaySignature(requests) {
  const list = Array.isArray(requests) ? requests : [];
  const parts = list
    .filter((r) => r?.id != null)
    .map((r) => {
      const status = normalizeQuoteStatus(r);
      const display = getQuoteMapDisplayKind(r) || "";
      const supporters = getEstimateSupporterCount(r);
      const badge = r?.isNewToday ? "n" : "";
      return `${r.id}:${status}:${display}:${supporters}${badge}`;
    })
    .sort((a, b) => String(a).localeCompare(String(b)));
  return `${list.length}:${parts.join("|")}`;
}
