import {
  getEnabledMapNavProviders,
  MAP_NAV_PROVIDER,
} from "../constants/mapNavigationProviders";
import { buildExternalMapLinks, openExternalMap } from "./externalMapLinks";

function buildProviderUrl(providerId, { lat, lng, title, address }) {
  const y = Number(lat);
  const x = Number(lng);
  const name = encodeURIComponent(title || address || "일당맵");
  const query = encodeURIComponent(address || title || "일당맵");

  switch (providerId) {
    case MAP_NAV_PROVIDER.NAVER:
      return Number.isFinite(y) && Number.isFinite(x)
        ? `https://map.naver.com/v5/search/${query}?c=${x},${y},15,0,0,0,dh`
        : `https://map.naver.com/v5/search/${query}`;
    case MAP_NAV_PROVIDER.KAKAO:
      return Number.isFinite(y) && Number.isFinite(x)
        ? `https://map.kakao.com/link/map/${name},${y},${x}`
        : `https://map.kakao.com/link/search/${query}`;
    case MAP_NAV_PROVIDER.TMAP:
      // TODO: SK openapi / 딥링크 연동 시 활성화
      if (!Number.isFinite(y) || !Number.isFinite(x)) return "";
      return `https://tmapapi.sktelecom.com/main/map?q=${name}&lat=${y}&lon=${x}`;
    case MAP_NAV_PROVIDER.GOOGLE:
      if (!Number.isFinite(y) || !Number.isFinite(x)) {
        return `https://www.google.com/maps/search/?api=1&query=${query}`;
      }
      return `https://www.google.com/maps/search/?api=1&query=${y},${x}`;
    default:
      return "";
  }
}

/**
 * 저장된 링크 + 좌표 기준 길찾기 옵션 목록.
 * @returns {Array<{ id, label, url }>}
 */
export function buildMapNavigationOptions({
  lat,
  lng,
  title,
  address,
  savedLinks = {},
} = {}) {
  const fallback = buildExternalMapLinks({ lat, lng, title, address });
  const linkByProvider = {
    [MAP_NAV_PROVIDER.NAVER]: savedLinks.naver || savedLinks.naverMapLink || fallback.naver,
    [MAP_NAV_PROVIDER.KAKAO]: savedLinks.kakao || savedLinks.kakaoMapLink || fallback.kakao,
    [MAP_NAV_PROVIDER.TMAP]: savedLinks.tmap || savedLinks.tmapMapLink || "",
    [MAP_NAV_PROVIDER.GOOGLE]: savedLinks.google || savedLinks.googleMapLink || "",
  };

  return getEnabledMapNavProviders()
    .map((provider) => {
      const url =
        linkByProvider[provider.id] ||
        buildProviderUrl(provider.id, { lat, lng, title, address });
      return url ? { id: provider.id, label: provider.label, url } : null;
    })
    .filter(Boolean);
}

export function openMapNavigationOption(option) {
  if (!option?.url) return;
  openExternalMap(option.url);
}

export function hasMapNavigationOptions(options) {
  return Array.isArray(options) && options.length > 0;
}
