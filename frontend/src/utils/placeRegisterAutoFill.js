import { getPlaceRegisterConfig } from "../constants/placeRegisterConfig";
import { buildExternalMapLinks } from "./externalMapLinks";
import { reverseGeocodeLatLngDetailed } from "./mapReverseGeocode";
import { pickNearestPlace, searchNearbyPlacesWithFallback } from "./mapNearbyPlace";
import { logPlaceRegister, resolvePlaceName } from "./placeRegisterDebug";

/**
 * 핀 좌표 기준 주소·근처 장소명 자동 채우기.
 * @returns {Promise<object>}
 */
export async function autoFillPlaceFromLatLng(kakao, lat, lng, placeType) {
  const y = Number(lat);
  const x = Number(lng);
  const config = getPlaceRegisterConfig(placeType);

  const addressInfo = await reverseGeocodeLatLngDetailed(kakao, y, x);

  let nearestPlace = null;
  let usedRadiusM = config?.radiusM || 50;
  let placeCount = 0;

  if (config && !config.addressOnly) {
    const { results, usedRadiusM: resolvedRadius } = await searchNearbyPlacesWithFallback(kakao, y, x, {
      categoryCode: config.categoryCode,
      keyword: config.keyword,
      radiusM: config.radiusM || 50,
    });
    usedRadiusM = resolvedRadius;
    placeCount = results.length;
    nearestPlace = pickNearestPlace(results);
  }

  const selectedPlace = nearestPlace;
  const placeName = resolvePlaceName(selectedPlace);
  const title = placeName;
  const address = addressInfo.address || nearestPlace?.address || "";
  const mapLinks = buildExternalMapLinks({
    lat: y,
    lng: x,
    title: title || config?.label || "일당맵",
    address,
  });

  const kakaoMapLink = nearestPlace?.placeUrl || mapLinks.kakao;
  const naverMapLink = mapLinks.naver;
  const hasAddress = Boolean(address);
  const hasPlaceName = Boolean(placeName);
  const autoFillFailed = !hasAddress && !hasPlaceName;
  const manualRequired = autoFillFailed || (Boolean(config?.categoryCode) && hasAddress && !hasPlaceName);
  const autoFillReady = !manualRequired;

  logPlaceRegister("AUTO-FILL", {
    placeType,
    address,
    placeCount,
    usedRadiusM,
    selectedPlace: selectedPlace
      ? {
          id: selectedPlace.id,
          place_name: selectedPlace.place_name,
          placeName: selectedPlace.placeName,
          title: selectedPlace.title,
          distanceM: selectedPlace.distanceM,
        }
      : null,
    placeName,
    hasAddress,
    hasPlaceName,
    autoFillFailed,
    manualRequired,
    autoFillReady,
  });

  return {
    lat: y,
    lng: x,
    address,
    roadAddress: addressInfo.roadAddress || nearestPlace?.roadAddress || "",
    jibunAddress: addressInfo.jibunAddress || nearestPlace?.jibunAddress || "",
    title,
    placeName,
    description: nearestPlace?.categoryName || "",
    placeUrl: nearestPlace?.placeUrl || "",
    kakaoMapLink,
    naverMapLink,
    nearestPlace,
    nearestDistanceM: nearestPlace?.distanceM ?? null,
    usedRadiusM,
    autoFillFailed,
    manualRequired,
    autoFillReady,
  };
}
