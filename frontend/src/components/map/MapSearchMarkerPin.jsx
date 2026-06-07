import React, { useEffect, useState } from "react";
import "./map-search-marker.css";

/** 검색 위치 마커 — 지도 오버레이 위 React 핀 (등록 임시핀과 별도) */
export default function MapSearchMarkerPin({ marker, map, kakao, isReady, onClick }) {
  const [point, setPoint] = useState(null);

  useEffect(() => {
    if (!isReady || !kakao || !map || !marker) {
      setPoint(null);
      return undefined;
    }

    const lat = Number(marker.lat);
    const lng = Number(marker.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setPoint(null);
      return undefined;
    }

    const update = () => {
      try {
        const latLng = new kakao.maps.LatLng(lat, lng);
        const projection = map.getProjection?.();
        if (!projection?.containerPointFromCoords) return;
        const containerPoint = projection.containerPointFromCoords(latLng);
        setPoint({ x: containerPoint.x, y: containerPoint.y });
      } catch (_) {
        /* noop */
      }
    };

    update();
    const listeners = ["idle", "center_changed", "zoom_changed", "drag", "dragend"].map((eventName) =>
      kakao.maps.event.addListener(map, eventName, update)
    );

    return () => {
      listeners.forEach((listener) => kakao.maps.event.removeListener(listener));
    };
  }, [isReady, kakao, map, marker]);

  if (!point || !marker) return null;

  return (
    <button
      type="button"
      className="map-search-marker map-search-marker--layer"
      style={{ left: point.x, top: point.y }}
      onClick={onClick}
      aria-label={marker.title || "검색 위치"}
    >
      <span className="map-search-marker__pin" aria-hidden="true" />
    </button>
  );
}
