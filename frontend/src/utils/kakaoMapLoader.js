const DEFAULT_KAKAO_APP_KEY = "e3ca13655de915a192d4448f0c03bf7d";
const SDK_LIBRARIES = "services,clusterer";

let loaderPromise = null;

/**
 * Kakao JavaScript 앱키. `.env`의 REACT_APP_KAKAO_MAP_KEY가 있으면 우선 사용하고,
 * 없으면 기존 하드코딩 키로 폴백한다. (CRA는 public/index.html에 커스텀 env를
 * 치환하지 못하므로 SDK를 런타임에 동적 주입한다.)
 */
export function getKakaoAppKey() {
  const fromEnv = process.env.REACT_APP_KAKAO_MAP_KEY;
  return (fromEnv && String(fromEnv).trim()) || DEFAULT_KAKAO_APP_KEY;
}

function resolveWhenMapsReady(resolve, reject) {
  if (!window.kakao || !window.kakao.maps) {
    reject(new Error("[kakao] SDK loaded but window.kakao.maps is missing"));
    return;
  }
  // autoload=false: Map/LatLng 등은 load 콜백 이후에 사용 가능.
  if (typeof window.kakao.maps.load === "function" && !window.kakao.maps.Map) {
    window.kakao.maps.load(() => resolve(window.kakao));
    return;
  }
  resolve(window.kakao);
}

/**
 * Kakao Maps SDK를 1회만 로드한다. 이미 로드됐으면 즉시 resolve.
 * @returns {Promise<typeof window.kakao>}
 */
export function loadKakaoMapsSdk() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("[kakao] no DOM environment"));
  }
  if (window.kakao && window.kakao.maps && window.kakao.maps.Map) {
    return Promise.resolve(window.kakao);
  }
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-kakao-sdk="true"], script[src*="dapi.kakao.com/v2/maps/sdk.js"]');
    if (existing) {
      if (window.kakao && window.kakao.maps) {
        resolveWhenMapsReady(resolve, reject);
        return;
      }
      existing.addEventListener("load", () => resolveWhenMapsReady(resolve, reject), { once: true });
      existing.addEventListener("error", () => reject(new Error("[kakao] existing SDK script failed to load")), { once: true });
      return;
    }

    const key = getKakaoAppKey();
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false&libraries=${SDK_LIBRARIES}`;
    script.async = true;
    script.dataset.kakaoSdk = "true";
    script.addEventListener("load", () => resolveWhenMapsReady(resolve, reject), { once: true });
    script.addEventListener("error", () => reject(new Error("[kakao] SDK script failed to load (check app key & registered domain)")), { once: true });
    document.head.appendChild(script);
  });

  // 실패 시 다음 호출에서 재시도할 수 있도록 캐시 해제.
  loaderPromise.catch(() => {
    loaderPromise = null;
  });

  return loaderPromise;
}
