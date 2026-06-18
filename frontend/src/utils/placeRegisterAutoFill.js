import {
  getPlaceRegisterConfig,
  PLACE_REGISTER_MODE,
} from "../constants/placeRegisterConfig";
import { buildExternalMapLinks } from "./externalMapLinks";
import { reverseGeocodeLatLngDetailed } from "./mapReverseGeocode";
import { pickNearestPlace, searchNearbyPlacesWithFallback } from "./mapNearbyPlace";
import { logPlaceRegister, resolvePlaceName } from "./placeRegisterDebug";
import { resolvePlaceRegisterOutcome } from "./placeRegisterUx";

/**
 * 핀 좌표 기준 주소·근처 장소명 자동 채우기.
 * @returns {Promise<object>}
 */
export async function autoFillPlaceFromLatLng(kakao, lat, lng, placeType) {
  const y = Number(lat);
  const x = Number(lng);
  const config = getPlaceRegisterConfig(placeType);
  const mode = config?.mode || PLACE_REGISTER_MODE.AUTO_OPTIONAL;

  const addressInfo = await reverseGeocodeLatLngDetailed(kakao, y, x);

  let nearestPlace = null;
  let usedRadiusM = config?.radiusM || 50;
  let placeCount = 0;
  let autoSearchAttempted = false;

  const shouldSearch =
    config?.autoSearch !== false &&
    mode !== PLACE_REGISTER_MODE.MANUAL_FIRST &&
    !config?.addressOnly;

  if (shouldSearch) {
    autoSearchAttempted = true;
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
  const title = mode === PLACE_REGISTER_MODE.MANUAL_FIRST ? "" : placeName;
  const address = addressInfo.address || nearestPlace?.address || "";
  const mapLinks = buildExternalMapLinks({
    lat: y,
    lng: x,
    title: title || placeName || config?.label || "일당맵",
    address,
  });

  const kakaoMapLink = nearestPlace?.placeUrl || mapLinks.kakao;
  const naverMapLink = mapLinks.naver;
  const hasAddress = Boolean(address);
  const hasPlaceName = Boolean(placeName);

  const outcome = resolvePlaceRegisterOutcome(placeType, config, {
    hasAddress,
    hasPlaceName,
    autoSearchAttempted,
  });

  logPlaceRegister("AUTO-FILL", {
    placeType,
    mode,
    address,
    placeCount,
    usedRadiusM,
    autoSearchAttempted,
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
    ...outcome,
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
    autoSearchAttempted,
    registerMode: mode,
    ...outcome,
  };
}
