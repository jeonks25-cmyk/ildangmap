export function normalizeKakaoPlace(place) {
  if (!place) return null;
  const lat = Number(place.y);
  const lng = Number(place.x);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    id: place.id || `${lat}:${lng}:${place.place_name || ""}`,
    title: place.place_name || "검색 위치",
    lat,
    lng,
    roadAddress: place.road_address_name || "",
    jibunAddress: place.address_name || "",
    address: place.road_address_name || place.address_name || "",
    categoryName: place.category_name || "",
    phone: place.phone || "",
    placeUrl: place.place_url || "",
  };
}

export function searchKakaoPlaces(kakao, query) {
  return new Promise((resolve) => {
    const keyword = String(query || "").trim();
    if (!keyword || !kakao?.maps?.services?.Places) {
      resolve([]);
      return;
    }

    const places = new kakao.maps.services.Places();
    places.keywordSearch(keyword, (data, status) => {
      if (status !== kakao.maps.services.Status.OK || !Array.isArray(data)) {
        resolve([]);
        return;
      }
      resolve(data.map(normalizeKakaoPlace).filter(Boolean).slice(0, 6));
    });
  });
}
