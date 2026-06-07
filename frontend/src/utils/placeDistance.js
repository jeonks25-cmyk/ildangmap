import { distanceKmBetween, formatDistanceLabel } from "./geoDistance";
import { MAP_ITEM_TYPE, MAP_ITEM_TYPE_LABEL } from "../constants/mapItemTypes";

/** 목록·마커 공통 — 향후 현장/자재상/공구대여/쉼터 확장 시 type만 추가 */
export const PLACE_LIST_CATEGORY_META = [
  {
    key: "apartment",
    chipLabel: "아파트",
    listLabel: "아파트",
    layers: [MAP_ITEM_TYPE.FIELD],
  },
  {
    key: "parking",
    chipLabel: "주차",
    listLabel: "주차장",
    layers: [MAP_ITEM_TYPE.PARKING],
  },
  {
    key: "restroom",
    chipLabel: "화장실",
    listLabel: "화장실",
    layers: [MAP_ITEM_TYPE.RESTROOM],
  },
  {
    key: "restaurant",
    chipLabel: "식당",
    listLabel: "식당",
    layers: [MAP_ITEM_TYPE.RESTAURANT, MAP_ITEM_TYPE.FOOD],
  },
];

export const PLACE_SORT_DISTANCE = "distance";
export const PLACE_SORT_NAME = "name";
export const PLACE_SORT_RECOMMENDED = "recommended";
export const PLACE_SORT_RECENT = "recent";

const PLACE_TYPE_ICONS = {
  [MAP_ITEM_TYPE.FIELD]: "🏢",
  [MAP_ITEM_TYPE.PARKING]: "🚗",
  [MAP_ITEM_TYPE.RESTROOM]: "🚻",
  [MAP_ITEM_TYPE.RESTAURANT]: "🍜",
  [MAP_ITEM_TYPE.FOOD]: "🍜",
  [MAP_ITEM_TYPE.ACCESS_INFO]: "🚪",
  [MAP_ITEM_TYPE.ELEVATOR]: "🛗",
  [MAP_ITEM_TYPE.MATERIAL_PICKUP]: "📦",
  [MAP_ITEM_TYPE.HARDWARE_STORE]: "🔧",
  [MAP_ITEM_TYPE.MEETING_PLACE]: "📍",
};

export function isLayerActive(visibleLayers, layer) {
  return visibleLayers?.[layer] !== false;
}

/** 활성화된 place-list 카테고리 (칩 ON) */
export function getActivePlaceCategories(visibleLayers) {
  return PLACE_LIST_CATEGORY_META.filter((cat) => cat.layers.some((layer) => isLayerActive(visibleLayers, layer)));
}

export function getPlaceTypeIcon(type) {
  return PLACE_TYPE_ICONS[type] || "📍";
}

export function computePlaceDistanceKm(item, originLat, originLng) {
  const lat = Number(item?.lat);
  const lng = Number(item?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return distanceKmBetween(originLat, originLng, lat, lng);
}

export function formatPlaceDistance(km) {
  return formatDistanceLabel(km);
}

export function buildPlaceListTitle(visibleLayers, count) {
  const active = getActivePlaceCategories(visibleLayers);
  const n = Number(count) || 0;
  if (active.length === 1) {
    return `주변 ${active[0].listLabel} ${n}곳`;
  }
  if (active.length === 0) {
    return `주변 장소 ${n}곳`;
  }
  const labels = active.map((c) => c.listLabel).join("·");
  return `주변 ${labels} ${n}곳`;
}

export function getPlaceRowTitle(item) {
  return String(item?.title || item?.label || MAP_ITEM_TYPE_LABEL[item?.type] || "장소").trim() || "장소";
}

export function getPlaceRowDescription(item) {
  const meta = String(item?.meta || item?.address || "").trim();
  if (meta) return meta;
  const tags = Array.isArray(item?.tags) ? item.tags.filter(Boolean).slice(0, 2).join(" · ") : "";
  return tags;
}

/** bounds 안 + 활성 레이어 place 타입만 */
export function filterPlacesInBounds(items, mapBounds) {
  if (!Array.isArray(items) || !items.length) return [];
  if (!mapBounds) return items.slice();
  const { minLat, maxLat, minLng, maxLng } = mapBounds;
  return items.filter((item) => {
    const lat = Number(item?.lat);
    const lng = Number(item?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
  });
}

export const PLACE_LIST_LAYER_ALLOW = new Set([
  MAP_ITEM_TYPE.FIELD,
  MAP_ITEM_TYPE.PARKING,
  MAP_ITEM_TYPE.RESTROOM,
  MAP_ITEM_TYPE.RESTAURANT,
  MAP_ITEM_TYPE.FOOD,
  MAP_ITEM_TYPE.ACCESS_INFO,
  MAP_ITEM_TYPE.ELEVATOR,
  MAP_ITEM_TYPE.MATERIAL_PICKUP,
  MAP_ITEM_TYPE.MATERIAL_SHARE,
  MAP_ITEM_TYPE.HARDWARE_STORE,
  MAP_ITEM_TYPE.CONVENIENCE_STORE,
  MAP_ITEM_TYPE.MEETING_PLACE,
  MAP_ITEM_TYPE.MEETING_POINT,
  MAP_ITEM_TYPE.SITE_MEMO,
  MAP_ITEM_TYPE.FIELD,
]);

export function isPlaceOverlayEligible(item) {
  const layer = item?.layer || item?.type;
  return PLACE_LIST_LAYER_ALLOW.has(layer);
}

export function filterPlacesByVisibleLayers(items, visibleLayers) {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => {
    const layer = item?.layer || item?.type;
    if (!PLACE_LIST_LAYER_ALLOW.has(layer)) return false;
    return isLayerActive(visibleLayers, layer);
  });
}

export function sortPlaces(items, sortMode = PLACE_SORT_DISTANCE) {
  const list = Array.isArray(items) ? items.slice() : [];
  if (sortMode === PLACE_SORT_NAME) {
    return list.sort((a, b) => {
      const cmp = getPlaceRowTitle(a).localeCompare(getPlaceRowTitle(b), "ko");
      if (cmp !== 0) return cmp;
      const da = Number.isFinite(Number(a?.distanceKm)) ? Number(a.distanceKm) : 999;
      const db = Number.isFinite(Number(b?.distanceKm)) ? Number(b.distanceKm) : 999;
      return da - db;
    });
  }
  if (sortMode === PLACE_SORT_RECENT) {
    return list.sort((a, b) => String(b?.sourceMeta?.updatedAt || "").localeCompare(String(a?.sourceMeta?.updatedAt || "")));
  }
  if (sortMode === PLACE_SORT_RECOMMENDED) {
    return list.sort((a, b) => {
      const scoreA = Number(a?.sourceMeta?.trustScore) || 0;
      const scoreB = Number(b?.sourceMeta?.trustScore) || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
    });
  }
  return list.sort((a, b) => {
    const da = Number.isFinite(Number(a?.distanceKm)) ? Number(a.distanceKm) : 999;
    const db = Number.isFinite(Number(b?.distanceKm)) ? Number(b.distanceKm) : 999;
    if (da !== db) return da - db;
    return getPlaceRowTitle(a).localeCompare(getPlaceRowTitle(b), "ko");
  });
}
