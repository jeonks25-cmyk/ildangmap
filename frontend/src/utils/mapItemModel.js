import { MAP_ITEM_TYPE, MAP_ITEM_TYPE_LABEL } from "../constants/mapItemTypes";
import { buildFieldJobTitle, getJobCraft, migrateJob, CRAFT_LABEL } from "./jobModel";
import { getEstimateMarkerSubline } from "../overlays/estimateSpeechBubbleOverlay";
import { normalizeQuoteStatus } from "../constants/quoteStatus";
import { getOyajiSiteShortName } from "./oyajiSiteModel";

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function compactList(values) {
  return values.map((v) => String(v || "").trim()).filter(Boolean);
}

function buildRelation(raw) {
  const source = raw?.relation || {};
  const relatedFieldId = source.relatedFieldId ?? raw?.relatedFieldId ?? null;
  const relevanceScore = Number(source.relevanceScore ?? raw?.relevanceScore ?? 0) || 0;
  const scope = source.scope || raw?.scope || "";
  if (relatedFieldId == null && !scope && relevanceScore <= 0) return null;
  return {
    relatedFieldId,
    relevanceScore,
    scope,
  };
}

function buildSourceMeta(raw) {
  const source = raw?.sourceMeta || {};
  const out = {
    createdBy: source.createdBy || raw?.createdBy || "ildangmap-demo",
    updatedAt: source.updatedAt || raw?.updatedAt || "",
    trustScore: Number(source.trustScore ?? raw?.trustScore ?? 0) || 0,
    reportCount: Number(source.reportCount ?? raw?.reportCount ?? 0) || 0,
    verificationStatus: source.verificationStatus || raw?.verificationStatus || "unverified",
  };
  return out;
}

export function getMapItemKey(item) {
  if (!item) return "";
  return `${item.type || "item"}:${item.sourceId || item.id || ""}`;
}

export function hasMapItemLocation(item) {
  return Number.isFinite(Number(item?.lat)) && Number.isFinite(Number(item?.lng));
}

/**
 * Common shape consumed by the field-life map pipeline:
 * { id, sourceId, type, layer, label, title, lat, lng, address, meta, tags, source }.
 *
 * Jobs and estimates are adapted into this shape for legacy compatibility, while
 * life-map items can be added by type without creating a dedicated marker hook.
 */
export function mapJobToMapItem(job) {
  if (!job) return null;
  const j = migrateJob(job);
  const lat = toFiniteNumber(j.lat);
  const lng = toFiniteNumber(j.lng);
  if (lat == null || lng == null) return null;
  const craft = CRAFT_LABEL[getJobCraft(j)] || "";
  const title = getOyajiSiteShortName(j) || buildFieldJobTitle(j);
  const meta = compactList([j.workTime, j.address || j.shortRegion || j.shortAddress]).join(" · ");

  return {
    id: `field:${j.id}`,
    sourceId: j.id,
    type: MAP_ITEM_TYPE.FIELD,
    layer: MAP_ITEM_TYPE.FIELD,
    label: MAP_ITEM_TYPE_LABEL[MAP_ITEM_TYPE.FIELD],
    title,
    lat,
    lng,
    distanceText: Number.isFinite(Number(j.distanceKm)) ? `${Number(j.distanceKm).toFixed(1)}km` : "",
    meta,
    tags: compactList([craft, j.isUrgent ? "긴급" : "", j.shortageCount > 0 ? "부족" : ""]),
    tone: j.isUrgent || j.shortageCount > 0 ? "urgent" : "field",
    source: j,
  };
}

export function mapEstimateToMapItem(request) {
  if (!request) return null;
  const lat = toFiniteNumber(request.lat);
  const lng = toFiniteNumber(request.lng);
  if (lat == null || lng == null) return null;
  const status = normalizeQuoteStatus(request);
  const title = String(request.title || request.category || "견적 요청").trim();

  return {
    id: `estimate:${request.id}`,
    sourceId: request.id,
    type: MAP_ITEM_TYPE.ESTIMATE,
    layer: MAP_ITEM_TYPE.ESTIMATE,
    label: MAP_ITEM_TYPE_LABEL[MAP_ITEM_TYPE.ESTIMATE],
    title,
    lat,
    lng,
    distanceText: Number.isFinite(Number(request.distanceKm)) ? `${Number(request.distanceKm).toFixed(1)}km` : "",
    meta: getEstimateMarkerSubline(request),
    tags: compactList([status, request.area, request.category || request.craftLabel]),
    tone: "estimate",
    source: request,
  };
}

export function createMapItemFromLifeInfo(raw) {
  if (!raw) return null;
  const type = raw.type || raw.layer;
  const lat = toFiniteNumber(raw.lat);
  const lng = toFiniteNumber(raw.lng);
  if (!type || lat == null || lng == null) return null;
  const relation = buildRelation(raw);
  const metaText =
    typeof raw.meta === "string"
      ? raw.meta
      : raw.meta?.description || raw.meta?.text || raw.meta?.sourceText || raw.description || "";
  return {
    id: raw.id || `${type}:${lat}:${lng}:${raw.title || ""}`,
    sourceId: raw.sourceId || raw.id || "",
    type,
    layer: raw.layer || type,
    label: MAP_ITEM_TYPE_LABEL[type] || "일당맵 정보",
    title: String(raw.title || MAP_ITEM_TYPE_LABEL[type] || "일당맵 정보").trim(),
    lat,
    lng,
    address: String(raw.address || raw.detailAddress || "").trim(),
    roadAddress: String(raw.roadAddress || raw.road_address_name || "").trim(),
    jibunAddress: String(raw.jibunAddress || raw.address_name || "").trim(),
    distanceText: String(raw.distanceText || "").trim(),
    meta: String(metaText || "").trim(),
    tags: Array.isArray(raw.tags) ? raw.tags.filter(Boolean) : [],
    tone: raw.tone || type,
    scheduleDate: String(raw.scheduleDate || raw.workDate || "").trim(),
    createdBy: raw.createdBy || raw.sourceMeta?.createdBy || "",
    visibility: raw.visibility || "public",
    contactPolicy: raw.contactPolicy || "none",
    operationPriority: raw.operationPriority || "optional",
    relation,
    relatedFieldId: relation?.relatedFieldId ?? null,
    relevanceScore: relation?.relevanceScore ?? 0,
    scope: relation?.scope || "",
    sourceMeta: buildSourceMeta(raw),
    experienceTags: Array.isArray(raw.experienceTags) ? raw.experienceTags.filter(Boolean) : [],
    comments: Array.isArray(raw.comments) ? raw.comments.filter(Boolean) : [],
    source: raw,
  };
}

export function buildLifeMapItems({ jobs = [], estimates = [], lifeItems = [] } = {}) {
  return [
    ...jobs.map(mapJobToMapItem),
    ...estimates.map(mapEstimateToMapItem),
    ...lifeItems.map(createMapItemFromLifeInfo),
  ].filter(hasMapItemLocation);
}

export function filterMapItemsByLayers(items, visibleLayers) {
  if (!Array.isArray(visibleLayers)) return Array.isArray(items) ? items : [];
  if (visibleLayers.length === 0) return [];
  const layerSet = new Set(visibleLayers);
  return (Array.isArray(items) ? items : []).filter((item) => layerSet.has(item?.layer || item?.type));
}

export function findMapItemBySource(items, type, sourceId) {
  return (Array.isArray(items) ? items : []).find(
    (item) => item?.type === type && String(item.sourceId) === String(sourceId)
  ) || null;
}
