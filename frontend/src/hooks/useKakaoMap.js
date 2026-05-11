import { useEffect, useRef, useState } from "react";

/**
 * Waits for Kakao Maps SDK and creates a map instance.
 * Returns { kakao, map, isReady }.
 */
export default function useKakaoMap(mapContainerRef, mapOption) {
  const mapRef = useRef(null);
  const resizeCleanupRef = useRef(null);
  const [state, setState] = useState({ kakao: null, map: null, isReady: false });

  useEffect(() => {
    let cancelled = false;
    let didLog = false;
    let didLogNullContainer = false;

    const waitKakao = setInterval(() => {
      // Dev-only diagnostics (logs once to avoid spam)
      if (!didLog && process.env.NODE_ENV !== "production") {
        // These are the exact values you asked to inspect in the browser console.
        // eslint-disable-next-line no-console
        console.log("[useKakaoMap] window.kakao =", window.kakao);
        // eslint-disable-next-line no-console
        console.log("[useKakaoMap] window.kakao?.maps =", window.kakao?.maps);
        // eslint-disable-next-line no-console
        console.log("[useKakaoMap] window.kakao?.maps?.load =", window.kakao?.maps?.load);
        didLog = true;
      }

      const hasKakaoMaps = window.kakao && window.kakao.maps;
      if (!hasKakaoMaps) return;

      const container = mapContainerRef?.current;
      if (!container) {
        if (!didLogNullContainer && process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.warn("[useKakaoMap] map container is null (ref not mounted yet)");
          didLogNullContainer = true;
        }
        return;
      }

      clearInterval(waitKakao);

      const kakao = window.kakao;
      const createMap = () => {
        if (cancelled) return;

        try {
          const center = mapOption?.center;
          const defaultCenter = new kakao.maps.LatLng(36.3504, 127.3845);

          const resolvedCenter =
            center && typeof center === "object" && "lat" in center && "lng" in center
              ? new kakao.maps.LatLng(center.lat, center.lng)
              : center || defaultCenter;

          const resolvedOption = {
            ...mapOption,
            center: resolvedCenter,
          };

          if (process.env.NODE_ENV !== "production") {
            const rect = container.getBoundingClientRect?.();
            // eslint-disable-next-line no-console
            console.log("[useKakaoMap] container rect =", rect);
            // eslint-disable-next-line no-console
            console.log("[useKakaoMap] mapOption(resolved) =", resolvedOption);
          }

          const map = new kakao.maps.Map(container, resolvedOption);
          mapRef.current = map;

          // Ensure correct rendering when container uses flex/relative layout.
          if (typeof map.relayout === "function") {
            map.relayout();
          }

          if (process.env.NODE_ENV !== "production") {
            // eslint-disable-next-line no-console
            console.log("[useKakaoMap] map created =", map);
          }

          setState({ kakao, map, isReady: true });

          const onWinResize = () => {
            try {
              if (typeof map.relayout === "function") map.relayout();
            } catch (_) {
              /* noop */
            }
          };
          window.addEventListener("resize", onWinResize);
          window.addEventListener("orientationchange", onWinResize);
          resizeCleanupRef.current = () => {
            window.removeEventListener("resize", onWinResize);
            window.removeEventListener("orientationchange", onWinResize);
            resizeCleanupRef.current = null;
          };
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error("[useKakaoMap] failed to create map:", e);
        }
      };

      const needsLoad = !(kakao.maps?.Map && kakao.maps?.LatLng);
      if (typeof kakao.maps.load === "function" && needsLoad) {
        // autoload=false case: Map/LatLng become available inside load callback.
        kakao.maps.load(createMap);
        return;
      }

      // autoload=true (or already loaded) case.
      createMap();
    }, 300);

    return () => {
      cancelled = true;
      clearInterval(waitKakao);
      resizeCleanupRef.current?.();
      mapRef.current = null;
    };
    // Intentionally depend on ref + options to recreate only when they change.
  }, [mapContainerRef, mapOption]);

  return state;
}

