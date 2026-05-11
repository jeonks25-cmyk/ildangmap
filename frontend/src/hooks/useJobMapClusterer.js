import { useEffect, useRef } from "react";

/**
 * 카카오 MarkerClusterer (sdk clusterer 라이브러리).
 * 말풍선 오버레이와 중복되지 않도록 enabled=false일 때는 제거만 수행.
 */
export default function useJobMapClusterer({ isReady, kakao, map, jobs, enabled }) {
  const clustererRef = useRef(null);

  useEffect(() => {
    const clear = () => {
      const c = clustererRef.current;
      if (c && typeof c.clear === "function") {
        try {
          c.clear();
        } catch (_) {
          /* noop */
        }
      }
      clustererRef.current = null;
    };

    if (!enabled || !isReady || !kakao || !map) {
      clear();
      return clear;
    }

    const ClusterCtor = kakao.maps?.MarkerClusterer;
    if (typeof ClusterCtor !== "function") {
      return clear;
    }

    clear();

    const markers = [];
    (Array.isArray(jobs) ? jobs : []).forEach((job) => {
      if (!job) return;
      const lat = Number(job.lat);
      const lng = Number(job.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(lat, lng),
        clickable: false,
      });
      marker.setOpacity(0.02);
      markers.push(marker);
    });

    if (markers.length === 0) {
      return clear;
    }

    const clusterer = new ClusterCtor({
      map,
      markers,
      averageCenter: true,
      minLevel: 1,
      gridSize: 72,
    });
    clustererRef.current = clusterer;

    return clear;
  }, [isReady, kakao, map, jobs, enabled]);
}
