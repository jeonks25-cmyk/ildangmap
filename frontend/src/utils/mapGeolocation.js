/** 카카오톡 인앱 브라우저 — Geolocation 제한이 잦음 */
export function isKakaoInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /KAKAOTALK/i.test(ua);
}

export function getGeolocationErrorMessage(error, { kakaoInApp = isKakaoInAppBrowser() } = {}) {
  const code = error?.code;

  if (code === 1) {
    if (kakaoInApp) {
      return "카카오톡에서는 위치 권한이 제한될 수 있어요. Chrome 또는 Safari에서 열어주세요.";
    }
    return "위치 권한이 거부되었어요. 브라우저 설정에서 위치 접근을 허용해 주세요.";
  }

  if (code === 2) {
    return "현재 위치를 확인할 수 없어요. GPS 또는 네트워크 상태를 확인해 주세요.";
  }

  if (code === 3) {
    if (kakaoInApp) {
      return "위치 요청 시간이 초과됐어요. Chrome 또는 Safari에서 열어주세요.";
    }
    return "위치 요청 시간이 초과됐어요. 잠시 후 다시 시도해 주세요.";
  }

  if (kakaoInApp) {
    return "위치를 가져오지 못했어요. Chrome 또는 Safari에서 열어주세요.";
  }

  return "위치를 가져오지 못했어요.";
}

export const MAP_MY_LOCATION_LEVEL = 3;

export const MAP_GEOLOCATION_OPTIONS = {
  enableHighAccuracy: false,
  timeout: 15000,
  maximumAge: 60000,
};
