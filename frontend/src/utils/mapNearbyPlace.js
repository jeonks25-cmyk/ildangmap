import { normalizeKakaoPlace } from "./mapPlaceSearch";
import { logPlaceRegister, resolveKakaoStatusLabel } from "./placeRegisterDebug";

const EARTH_RADIUS_M = 6371000;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/** Haversine 거리 (m) */
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const aLat = Number(lat1);
  const aLng = Number(lng1);
  const bLat = Number(lat2);
  const bLng = Number(lng2);
  if (![aLat, aLng, bLat, bLng].every(Number.isFinite)) return Infinity;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function unwrapPlacesData(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.places)) return data.places;
  return [];
}

function attachDistanceAndSort(places, lat, lng) {
  return places
    .map((place) => {
      const apiDistance = Number(place.distanceM);
      const distanceM = Number.isFinite(apiDistance)
        ? apiDistance
        : distanceMeters(lat, lng, place.lat, place.lng);
      return { ...place, distanceM };
    })
    .sort((a, b) => a.distanceM - b.distanceM);
}

/**
 * 좌표 기준 반경 내 장소 검색 (Kakao Places).
 * API radius로 1차 필터링 — 클라이언트 재필터는 API distance 미제공 시에만 적용.
 */
export function searchNearbyPlaces(kakao, lat, lng, { categoryCode, keyword, radiusM = 50 } = {}) {
  return new Promise((resolve) => {
    const y = Number(lat);
    const x = Number(lng);
    if (!kakao?.maps?.services?.Places || !Number.isFinite(y) || !Number.isFinite(x)) {
      logPlaceRegister("NEARBY-SEARCH", {
        skipped: true,
        reason: "missing kakao Places or invalid coordinates",
        lat: y,
        lng: x,
      });
      resolve([]);
      return;
    }

    const places = new kakao.maps.services.Places();
    const location = new kakao.maps.LatLng(y, x);
    const searchOptions = {
      location,
      radius: radiusM,
      sort: kakao.maps.services.SortBy.DISTANCE,
      size: 15,
    };

    const onResult = (data, status) => {
      const statusLabel = resolveKakaoStatusLabel(kakao, status);
      const rawList = unwrapPlacesData(data);
      const rawCount = rawList.length;

      if (status !== kakao.maps.services.Status.OK || !rawCount) {
        logPlaceRegister("NEARBY-SEARCH", {
          status: statusLabel,
          rawCount: 0,
          filteredCount: 0,
          radiusM,
          categoryCode: categoryCode || null,
          keyword: keyword || null,
          firstRaw: null,
        });
        resolve([]);
        return;
      }

      const normalized = rawList.map(normalizeKakaoPlace).filter(Boolean);
      const sorted = attachDistanceAndSort(normalized, y, x);
      const filtered = sorted.filter((place) => {
        const apiDistance = Number(place.distanceM);
        if (Number.isFinite(apiDistance)) return apiDistance <= radiusM;
        return place.distanceM <= radiusM;
      });

      logPlaceRegister("NEARBY-SEARCH", {
        status: statusLabel,
        rawCount,
        normalizedCount: normalized.length,
        filteredCount: filtered.length,
        radiusM,
        categoryCode: categoryCode || null,
        keyword: keyword || null,
        firstRaw: rawList[0]
          ? {
              place_name: rawList[0].place_name,
              distance: rawList[0].distance,
              x: rawList[0].x,
              y: rawList[0].y,
            }
          : null,
        firstFiltered: filtered[0]
          ? {
              placeName: filtered[0].placeName,
              title: filtered[0].title,
              distanceM: filtered[0].distanceM,
            }
          : null,
      });

      resolve(filtered);
    };

    if (categoryCode) {
      places.categorySearch(categoryCode, onResult, searchOptions);
      return;
    }
    if (keyword) {
      places.keywordSearch(keyword, onResult, searchOptions);
      return;
    }
    logPlaceRegister("NEARBY-SEARCH", { skipped: true, reason: "no categoryCode or keyword" });
    resolve([]);
  });
}

export function pickNearestPlace(places) {
  if (!Array.isArray(places) || !places.length) return null;
  return places[0];
}

/** 반경 단계 확대 (50 → 100 → 200m) */
export async function searchNearbyPlacesWithFallback(kakao, lat, lng, { radiusM = 50, ...rest } = {}) {
  const steps = [...new Set([radiusM, 100, 200].filter((value) => Number.isFinite(value) && value > 0))].sort(
    (a, b) => a - b
  );
  for (const step of steps) {
    const results = await searchNearbyPlaces(kakao, lat, lng, { ...rest, radiusM: step });
    if (results.length) {
      logPlaceRegister("NEARBY-SEARCH-FALLBACK", { usedRadiusM: step, placeCount: results.length });
      return { results, usedRadiusM: step };
    }
  }
  return { results: [], usedRadiusM: radiusM };
}
