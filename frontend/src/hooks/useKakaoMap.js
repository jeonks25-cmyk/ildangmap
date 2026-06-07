import { useEffect, useRef, useState } from "react";
import { isMapTouchDebugEnabled, logMapDraggableState } from "../utils/mapTouchDiagnostics";
import { loadKakaoMapsSdk } from "../utils/kakaoMapLoader";

/**
 * Loads the Kakao Maps SDK (via dynamic loader) and creates a map instance.
 * Returns { kakao, map, isReady }.
 */
export default function useKakaoMap(mapContainerRef, mapOption) {
  const mapRef = useRef(null);
  const resizeCleanupRef = useRef(null);
  const [state, setState] = useState({ kakao: null, map: null, isReady: false });

  useEffect(() => {
    let cancelled = false;

    const createMap = (kakao, container) => {
      if (cancelled || !container) return;

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
          draggable: mapOption?.draggable !== false,
          scrollwheel: mapOption?.scrollwheel !== false,
        };

        const map = new kakao.maps.Map(container, resolvedOption);
        mapRef.current = map;
        container.__ildangMap = map;

        if (typeof map.setDraggable === "function") map.setDraggable(true);
        if (typeof map.setZoomable === "function") map.setZoomable(true);

        const safeRelayout = () => {
          try {
            if (typeof map.relayout === "function") map.relayout();
          } catch (_) {
            /* noop */
          }
        };

        // Ensure correct rendering when container uses flex/relative layout.
        safeRelayout();
        // Container size can settle a frame after creation; relayout again so
        // tiles render even if the canvas was 0-sized at the exact create moment.
        requestAnimationFrame(safeRelayout);

        if (isMapTouchDebugEnabled()) {
          logMapDraggableState(map, "after create");
        }

        setState({ kakao, map, isReady: true });

        // Relayout whenever the container box changes (covers late layout / tab switches).
        let resizeObserver = null;
        if (typeof ResizeObserver === "function") {
          resizeObserver = new ResizeObserver(() => safeRelayout());
          resizeObserver.observe(container);
        }
        window.addEventListener("resize", safeRelayout);
        window.addEventListener("orientationchange", safeRelayout);
        resizeCleanupRef.current = () => {
          if (resizeObserver) resizeObserver.disconnect();
          window.removeEventListener("resize", safeRelayout);
          window.removeEventListener("orientationchange", safeRelayout);
          resizeCleanupRef.current = null;
        };
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[useKakaoMap] failed to create map:", e);
      }
    };

    loadKakaoMapsSdk()
      .then((kakao) => {
        if (cancelled) return;
        const container = mapContainerRef?.current;
        if (!container) return;
        createMap(kakao, container);
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error("[useKakaoMap] Kakao SDK load failed:", e);
      });

    return () => {
      cancelled = true;
      resizeCleanupRef.current?.();
      mapRef.current = null;
    };
    // Intentionally depend on ref + options to recreate only when they change.
  }, [mapContainerRef, mapOption]);

  return state;
}

