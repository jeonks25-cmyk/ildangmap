import { useEffect } from "react";
import { isSameMapBounds, normalizeMapBounds } from "../utils/mapBoundsUtils";

function relayoutMap(map) {
  if (!map || typeof map.relayout !== "function") return;
  requestAnimationFrame(() => map.relayout());
}

export function useSelectedJobSheetSync({
  selectedJobId,
  jobsForMap,
  sheetListRef,
  setSelectedJobId,
  setDetailJobId,
}) {
  useEffect(() => {
    if (selectedJobId == null) return;
    const id = selectedJobId;
    const t = window.setTimeout(() => {
      const root = sheetListRef.current;
      if (!root) return;
      const esc = typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(String(id)) : String(id);
      const el = root.querySelector(`[data-job-id="${esc}"]`);
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 60);
    return () => window.clearTimeout(t);
  }, [selectedJobId, sheetListRef]);

  useEffect(() => {
    if (selectedJobId == null) return;
    if (jobsForMap.some((job) => job && job.id === selectedJobId)) return;
    setSelectedJobId(null);
    setDetailJobId((prev) => (prev === selectedJobId ? null : prev));
  }, [jobsForMap, selectedJobId, setDetailJobId, setSelectedJobId]);
}

export function useKakaoMapSelectionReset({
  isReady,
  kakao,
  map,
  markerClickAtRef,
  setSelectedJobId,
  setDetailJobId,
  onResetSelection,
}) {
  useEffect(() => {
    if (!isReady || !kakao || !map) return;
    const handleMapClick = () => {
      if (Date.now() - markerClickAtRef.current < 220) return;
      setSelectedJobId(null);
      setDetailJobId(null);
      onResetSelection?.();
    };
    kakao.maps?.event?.addListener?.(map, "click", handleMapClick);
    return () => {
      kakao.maps?.event?.removeListener?.(map, "click", handleMapClick);
    };
  }, [isReady, kakao, map, markerClickAtRef, onResetSelection, setDetailJobId, setSelectedJobId]);
}

export function readMapBoundsFromMap(map) {
  if (!map || typeof map.getBounds !== "function") return null;
  try {
    const b = map.getBounds();
    const sw = b?.getSouthWest?.();
    const ne = b?.getNorthEast?.();
    if (!sw || !ne) return null;
    return {
      minLat: sw.getLat(),
      maxLat: ne.getLat(),
      minLng: sw.getLng(),
      maxLng: ne.getLng(),
    };
  } catch (_) {
    return null;
  }
}

export function useKakaoMapViewportSync({
  isReady,
  kakao,
  map,
  refreshKey,
  setZoomFar,
  setMapLevel,
  setMapBounds,
  liveBoundsSync = false,
}) {
  useEffect(() => {
    if (!isReady || !kakao || !map || !kakao.maps?.event) return;

    let rafId = null;

    const syncBounds = () => {
      try {
        const lv = map.getLevel();
        setZoomFar(lv >= 8);
      } catch (_) {
        /* noop */
      }

      const raw = readMapBoundsFromMap(map);
      if (!raw) return;
      const next = normalizeMapBounds(raw);
      setMapBounds((prev) => (isSameMapBounds(prev, next) ? prev : next));
    };

    const scheduleBoundsSync = () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        syncBounds();
      });
    };

    syncBounds();
    kakao.maps.event.addListener(map, "idle", syncBounds);
    kakao.maps.event.addListener(map, "dragend", scheduleBoundsSync);
    kakao.maps.event.addListener(map, "zoom_changed", scheduleBoundsSync);

    if (liveBoundsSync) {
      kakao.maps.event.addListener(map, "center_changed", scheduleBoundsSync);
    }

    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      kakao.maps.event.removeListener(map, "idle", syncBounds);
      kakao.maps.event.removeListener(map, "dragend", scheduleBoundsSync);
      kakao.maps.event.removeListener(map, "zoom_changed", scheduleBoundsSync);
      if (liveBoundsSync) {
        kakao.maps.event.removeListener(map, "center_changed", scheduleBoundsSync);
      }
    };
  }, [isReady, kakao, map, refreshKey, setMapBounds, setMapLevel, setZoomFar, liveBoundsSync]);
}

export function useVisualViewportMapRelayout(map) {
  useEffect(() => {
    if (!map || typeof map.relayout !== "function") return;
    const vv = window.visualViewport;
    if (!vv) return;
    const onVv = () => relayoutMap(map);
    vv.addEventListener("resize", onVv);
    vv.addEventListener("scroll", onVv);
    return () => {
      vv.removeEventListener("resize", onVv);
      vv.removeEventListener("scroll", onVv);
    };
  }, [map]);
}

export function useMapTransientCleanup({ myLocationMarkerRef, locationToastTimerRef }) {
  useEffect(() => {
    const markerRef = myLocationMarkerRef;
    const timerRef = locationToastTimerRef;
    return () => {
      if (markerRef.current && typeof markerRef.current.setMap === "function") {
        markerRef.current.setMap(null);
      }
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [locationToastTimerRef, myLocationMarkerRef]);
}
