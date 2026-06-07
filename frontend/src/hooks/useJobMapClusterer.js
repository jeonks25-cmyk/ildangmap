import { useEffect, useMemo, useRef } from "react";
import { buildJobsOverlaySignature } from "../utils/mapOverlaySignature";

/**
 * 카카오 MarkerClusterer (sdk clusterer 라이브러리).
 * 말풍선 오버레이와 중복되지 않도록 enabled=false일 때는 제거만 수행.
 */
export default function useJobMapClusterer({
  isReady,
  kakao,
  map,
  jobs,
  jobsSignature: jobsSignatureProp,
  enabled,
}) {
  const clustererRef = useRef(null);
  const signatureRef = useRef("");
  const jobsRef = useRef(jobs);

  const computedSignature = useMemo(() => buildJobsOverlaySignature(jobs), [jobs]);
  const jobsSignature = jobsSignatureProp ?? computedSignature;

  jobsRef.current = jobs;

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
      signatureRef.current = "";
    };

    if (!enabled || !isReady || !kakao || !map) {
      clear();
      return clear;
    }

    const ClusterCtor = kakao.maps?.MarkerClusterer;
    if (typeof ClusterCtor !== "function") {
      return clear;
    }

    if (signatureRef.current === jobsSignature && clustererRef.current) {
      return clear;
    }

    clear();

    const markers = [];
    (Array.isArray(jobsRef.current) ? jobsRef.current : []).forEach((job) => {
      if (!job) return;
      const lat = Number(job.lat);
      const lng = Number(job.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(lat, lng),
        clickable: false,
        opacity: 0,
        zIndex: 0,
      });
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
      gridSize: 88,
      calculator: [10, 25, 50],
      texts(clusterSize) {
        return String(clusterSize);
      },
      styles: [
        {
          width: "30px",
          height: "30px",
          background: "#e8f4ff",
          borderRadius: "50%",
          color: "#3b82f6",
          textAlign: "center",
          lineHeight: "30px",
          fontWeight: "700",
          fontSize: "11px",
          border: "1px solid rgba(147, 197, 253, 0.65)",
          boxShadow: "none",
        },
        {
          width: "32px",
          height: "32px",
          background: "#dbeafe",
          borderRadius: "50%",
          color: "#2563eb",
          textAlign: "center",
          lineHeight: "32px",
          fontWeight: "700",
          fontSize: "12px",
          border: "1px solid rgba(147, 197, 253, 0.75)",
          boxShadow: "none",
        },
        {
          width: "34px",
          height: "34px",
          background: "#cfe4ff",
          borderRadius: "50%",
          color: "#1d4ed8",
          textAlign: "center",
          lineHeight: "34px",
          fontWeight: "700",
          fontSize: "12px",
          border: "1px solid rgba(96, 165, 250, 0.8)",
          boxShadow: "none",
        },
      ],
    });
    clustererRef.current = clusterer;
    signatureRef.current = jobsSignature;

    return clear;
  }, [isReady, kakao, map, jobsSignature, enabled]);
}
