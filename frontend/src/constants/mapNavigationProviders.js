/** 외부 지도 앱 식별자 — 티맵·구글맵 등 확장 시 여기에 추가 */
export const MAP_NAV_PROVIDER = {
  NAVER: "naver",
  KAKAO: "kakao",
  TMAP: "tmap",
  GOOGLE: "google",
};

/**
 * 길찾기 바텀시트 옵션 레지스트리.
 * enabled: false 인 항목은 URL 빌더가 준비되면 활성화.
 */
export const MAP_NAV_PROVIDER_REGISTRY = [
  {
    id: MAP_NAV_PROVIDER.NAVER,
    label: "네이버지도로 열기",
    enabled: true,
  },
  {
    id: MAP_NAV_PROVIDER.KAKAO,
    label: "카카오맵으로 열기",
    enabled: true,
  },
  {
    id: MAP_NAV_PROVIDER.TMAP,
    label: "티맵으로 열기",
    enabled: false,
  },
  {
    id: MAP_NAV_PROVIDER.GOOGLE,
    label: "Google Maps로 열기",
    enabled: false,
  },
];

export function getEnabledMapNavProviders() {
  return MAP_NAV_PROVIDER_REGISTRY.filter((item) => item.enabled);
}
