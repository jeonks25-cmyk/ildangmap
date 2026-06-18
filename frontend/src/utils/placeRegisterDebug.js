/** 개발·REACT_APP_PLACE_REGISTER_DEBUG=true 시 장소 자동등록 디버그 로그 */
export const PLACE_REGISTER_DEBUG =
  process.env.NODE_ENV === "development" || process.env.REACT_APP_PLACE_REGISTER_DEBUG === "true";

export function logPlaceRegister(tag, payload) {
  if (!PLACE_REGISTER_DEBUG) return;
  // eslint-disable-next-line no-console
  console.log(`[${tag}]`, payload);
}

export function resolveKakaoStatusLabel(kakao, status) {
  const Status = kakao?.maps?.services?.Status;
  if (!Status) return String(status);
  const entry = Object.entries(Status).find(([, value]) => value === status);
  return entry ? entry[0] : String(status);
}

export function resolvePlaceName(place) {
  if (!place) return "";
  return String(place.placeName || place.title || place.place_name || "").trim();
}
