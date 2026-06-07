import { MAP_ITEM_TYPE } from "../constants/mapItemTypes";
import { distanceKmBetween } from "./geoDistance";

const OVERVIEW_TYPES = new Set([
  MAP_ITEM_TYPE.ACCESS_INFO,
  MAP_ITEM_TYPE.RESTAURANT,
  MAP_ITEM_TYPE.RESTROOM,
  MAP_ITEM_TYPE.PARKING,
  MAP_ITEM_TYPE.MEETING_PLACE,
]);

const OPS_TYPES = new Set([
  ...OVERVIEW_TYPES,
  MAP_ITEM_TYPE.ELEVATOR,
]);

const DETAIL_TYPES = new Set([
  ...OPS_TYPES,
  MAP_ITEM_TYPE.SITE_MEMO,
]);

const ARRIVAL_PRIORITY_TYPES = new Set([
  MAP_ITEM_TYPE.PARKING,
  MAP_ITEM_TYPE.ACCESS_INFO,
  MAP_ITEM_TYPE.ELEVATOR,
  MAP_ITEM_TYPE.MATERIAL_PICKUP,
  MAP_ITEM_TYPE.SITE_MEMO,
  MAP_ITEM_TYPE.MEETING_PLACE,
]);

const PRIORITY_WEIGHT = {
  critical: 60,
  important: 34,
  optional: 8,
};

const FOCUS_REDUCED_TYPES = new Set([
  MAP_ITEM_TYPE.RESTAURANT,
  MAP_ITEM_TYPE.RESTROOM,
]);

export function isLifeInfoMapItem(item) {
  return item?.type !== MAP_ITEM_TYPE.FIELD && item?.type !== MAP_ITEM_TYPE.ESTIMATE;
}

export function getMapLevelVisibilityBand(mapLevel) {
  const level = Number(mapLevel);
  if (!Number.isFinite(level)) return "overview";
  if (level >= 7) return "overview";
  if (level >= 5) return "ops";
  return "detail";
}

export function getVisibleLifeInfoTypesForMapLevel(mapLevel) {
  const band = getMapLevelVisibilityBand(mapLevel);
  if (band === "detail") return DETAIL_TYPES;
  if (band === "ops") return OPS_TYPES;
  return OVERVIEW_TYPES;
}

function normalizeRelation(item) {
  const rel = item?.relation || {};
  return {
    relatedFieldId: rel.relatedFieldId ?? item?.relatedFieldId ?? null,
    relevanceScore: Number(rel.relevanceScore ?? item?.relevanceScore ?? 0) || 0,
    scope: rel.scope || item?.scope || "nearby",
  };
}

function getDistanceToFieldKm(item, fieldItem) {
  if (!item || !fieldItem) return null;
  return distanceKmBetween(fieldItem.lat, fieldItem.lng, item.lat, item.lng);
}

function getArrivalRelevance(item, selectedFieldItem) {
  if (!selectedFieldItem || !isLifeInfoMapItem(item)) return null;
  const relation = normalizeRelation(item);
  const sameField =
    relation.relatedFieldId != null &&
    String(relation.relatedFieldId) === String(selectedFieldItem.sourceId || selectedFieldItem.id);
  const distanceKm = getDistanceToFieldKm(item, selectedFieldItem);
  const nearby = Number.isFinite(distanceKm) && distanceKm <= 0.9;
  const priority = item.operationPriority || "optional";
  const operational = ARRIVAL_PRIORITY_TYPES.has(item.type) || priority === "critical";
  if (!sameField && (!nearby || !operational)) return null;

  const relationScore = Math.min(100, Math.max(0, relation.relevanceScore));
  const distanceScore = Number.isFinite(distanceKm) ? Math.max(0, 28 - distanceKm * 24) : 0;
  const typeScore = ARRIVAL_PRIORITY_TYPES.has(item.type) ? 18 : 8;
  const priorityScore = PRIORITY_WEIGHT[priority] ?? PRIORITY_WEIGHT.optional;
  return {
    relation,
    distanceKm,
    operationPriority: priority,
    score: relationScore + distanceScore + typeScore + priorityScore + (sameField ? 25 : 0),
    reason: sameField ? "선택 현장 전용 정보" : "선택 현장 주변 정보",
  };
}

export function filterLifeInfoItemsByMapContext(items, { mapLevel, selectedFieldItem } = {}) {
  const zoomTypes = getVisibleLifeInfoTypesForMapLevel(mapLevel);
  const focusMode = Boolean(selectedFieldItem);
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      if (!isLifeInfoMapItem(item)) return item;
      const arrival = getArrivalRelevance(item, selectedFieldItem);
      const zoomVisible = zoomTypes.has(item.type);
      if (!focusMode && !zoomVisible) return null;
      if (focusMode && !arrival && !zoomVisible) return null;
      const priority = arrival?.operationPriority || item.operationPriority || "optional";
      const focusDimmed =
        focusMode &&
        !arrival &&
        (FOCUS_REDUCED_TYPES.has(item.type) || priority === "optional");
      const sticky = focusMode && item.type === MAP_ITEM_TYPE.SITE_MEMO && Boolean(arrival);
      return {
        ...item,
        relation: arrival?.relation || item.relation || null,
        operationPriority: priority,
        operationFocusMode: focusMode,
        isArrivalRelevant: Boolean(arrival),
        isOperationDimmed: focusDimmed,
        isOperationSticky: sticky,
        arrivalRelevanceScore: arrival?.score || 0,
        arrivalRelevanceReason: arrival?.reason || "",
        arrivalDistanceKm: arrival?.distanceKm ?? null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.isOperationSticky !== a.isOperationSticky) return b.isOperationSticky ? 1 : -1;
      if (b.isArrivalRelevant !== a.isArrivalRelevant) return b.isArrivalRelevant ? 1 : -1;
      const pa = PRIORITY_WEIGHT[a.operationPriority] ?? 0;
      const pb = PRIORITY_WEIGHT[b.operationPriority] ?? 0;
      if (pb !== pa) return pb - pa;
      if ((b.arrivalRelevanceScore || 0) !== (a.arrivalRelevanceScore || 0)) {
        return (b.arrivalRelevanceScore || 0) - (a.arrivalRelevanceScore || 0);
      }
      return String(a.title || "").localeCompare(String(b.title || ""));
    });
}
