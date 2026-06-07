import { useMemo } from "react";
import { computePlaceDistanceKm, formatPlaceDistance } from "../utils/placeDistance";

/**
 * 장소 목록에 거리(km·라벨) 부여
 * @param {object[]} items map item[]
 * @param {number|null} originLat
 * @param {number|null} originLng
 */
export function enrichPlacesWithDistance(items, originLat, originLng) {
  const oLat = Number(originLat);
  const oLng = Number(originLng);
  const hasOrigin = Number.isFinite(oLat) && Number.isFinite(oLng);
  return (Array.isArray(items) ? items : []).map((item) => {
    const distanceKm = hasOrigin ? computePlaceDistanceKm(item, oLat, oLng) : null;
    return {
      ...item,
      distanceKm,
      distanceLabel: formatPlaceDistance(distanceKm),
    };
  });
}

export default function usePlaceDistance(items, originLat, originLng) {
  return useMemo(() => enrichPlacesWithDistance(items, originLat, originLng), [items, originLat, originLng]);
}
