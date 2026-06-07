export function buildExternalMapLinks({ lat, lng, title, address } = {}) {
  const y = Number(lat);
  const x = Number(lng);
  const name = encodeURIComponent(title || address || "일당맵 위치");
  const query = encodeURIComponent(address || title || "일당맵 위치");

  return {
    naver:
      Number.isFinite(y) && Number.isFinite(x)
        ? `https://map.naver.com/v5/search/${query}?c=${x},${y},15,0,0,0,dh`
        : `https://map.naver.com/v5/search/${query}`,
    kakao:
      Number.isFinite(y) && Number.isFinite(x)
        ? `https://map.kakao.com/link/map/${name},${y},${x}`
        : `https://map.kakao.com/link/search/${query}`,
  };
}

export function openExternalMap(url) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function openFieldNavigation(field) {
  const lat = Number(field?.lat);
  const lng = Number(field?.lng);
  const name = encodeURIComponent(field?.fieldName || field?.title || "현장");
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    window.open(`https://map.kakao.com/link/to/${name},${lat},${lng}`, "_blank", "noopener,noreferrer");
  }
}
